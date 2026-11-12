
import json
from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from database import engine
from services.rag_service import generate_rag_answer

router = APIRouter(prefix="/api", tags=["AgriSense AI"])


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=2000)
    region_id: int | None = Field(default=None, gt=0)
    top_k: int = Field(default=5, ge=1, le=10)
    conversation_id: UUID | None = None


def get_conversation_history(conversation_id):
    query = """
        SELECT role, content
        FROM conversation_messages
        WHERE conversation_id = :conversation_id
        ORDER BY message_id DESC
        LIMIT 10;
    """

    with engine.connect() as connection:
        result = connection.execute(
            text(query),
            {"conversation_id": conversation_id}
        )

        messages = [
            dict(row)
            for row in result.mappings().all()
        ]

    messages.reverse()
    return messages


def save_conversation(
    conversation_id,
    question,
    answer,
    region_id,
    sources
):
    with engine.begin() as connection:
        connection.execute(
            text("""
                INSERT INTO conversation_sessions
                    (conversation_id, region_id)
                VALUES
                    (:conversation_id, :region_id)
                ON CONFLICT (conversation_id)
                DO UPDATE SET
                    region_id = EXCLUDED.region_id,
                    updated_at = NOW();
            """),
            {
                "conversation_id": conversation_id,
                "region_id": region_id
            }
        )

        connection.execute(
            text("""
                INSERT INTO conversation_messages
                    (conversation_id, role, content, sources)
                VALUES
                    (:conversation_id, 'user', :question, NULL),
                    (
                        :conversation_id,
                        'assistant',
                        :answer,
                        CAST(:sources AS JSONB)
                    );
            """),
            {
                "conversation_id": conversation_id,
                "question": question,
                "answer": answer,
                "sources": json.dumps(sources or [])
            }
        )


@router.post("/chat")
def chat(request: ChatRequest):
    try:
        conversation_id = request.conversation_id or uuid4()

        history = get_conversation_history(conversation_id)

        result = generate_rag_answer(
            question=request.question,
            region_id=request.region_id,
            top_k=request.top_k,
            conversation_history=history
        )

        answer = result["answer"]

        save_conversation(
            conversation_id=conversation_id,
            question=request.question,
            answer=answer,
            region_id=request.region_id,
            sources=result.get("sources", [])
        )

        return {
            "status": "success",
            "conversation_id": str(conversation_id),
            **result
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"RAG processing failed: {str(e)}"
        )


# List saved conversations
@router.get("/conversations")
def list_conversations():
    try:
        query = """
            SELECT
                s.conversation_id,
                s.region_id,
                s.created_at,
                s.updated_at,
                COALESCE(
                    (
                        SELECT LEFT(m.content, 35)
                        FROM conversation_messages m
                        WHERE m.conversation_id = s.conversation_id
                          AND m.role = 'user'
                        ORDER BY m.message_id ASC
                        LIMIT 1
                    ),
                    'New conversation'
                ) AS title
            FROM conversation_sessions s
            ORDER BY s.updated_at DESC;
        """

        with engine.connect() as connection:
            rows = connection.execute(text(query)).mappings().all()

        return [
            {
                "id": str(row["conversation_id"]),
                "title": (
                    row["title"] + "..."
                    if len(row["title"]) == 35
                    else row["title"]
                ),
                "region_id": row["region_id"],
                "created_at": row["created_at"].isoformat(),
                "updated_at": row["updated_at"].isoformat()
            }
            for row in rows
        ]

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve conversations: {str(e)}"
        )


# Retrieve messages from one conversation
@router.get("/conversations/{conversation_id}/messages")
def get_conversation_messages(conversation_id: UUID):
    try:
        with engine.connect() as connection:
            session = connection.execute(
                text("""
                    SELECT conversation_id, region_id
                    FROM conversation_sessions
                    WHERE conversation_id = :conversation_id;
                """),
                {"conversation_id": conversation_id}
            ).mappings().first()

            if not session:
                raise HTTPException(
                    status_code=404,
                    detail="Conversation not found"
                )

            rows = connection.execute(
                text("""
                    SELECT message_id, role, content, sources, created_at
                    FROM conversation_messages
                    WHERE conversation_id = :conversation_id
                    ORDER BY message_id ASC;
                """),
                {"conversation_id": conversation_id}
            ).mappings().all()

        return {
            "conversation_id": str(session["conversation_id"]),
            "region_id": session["region_id"],
            "messages": [
                {
                    "id": str(row["message_id"]),
                    "role": row["role"],
                    "content": row["content"],
                    "sources": row["sources"] or []
                }
                for row in rows
            ]
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not retrieve messages: {str(e)}"
        )


# Delete a conversation permanently
@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: UUID):
    try:
        with engine.begin() as connection:
            result = connection.execute(
                text("""
                    DELETE FROM conversation_sessions
                    WHERE conversation_id = :conversation_id;
                """),
                {"conversation_id": conversation_id}
            )

            if result.rowcount == 0:
                raise HTTPException(
                    status_code=404,
                    detail="Conversation not found"
                )

        return {"status": "success", "message": "Conversation deleted"}

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete conversation: {str(e)}"
        )
