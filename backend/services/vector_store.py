
from sqlalchemy import text
from database import engine

from services.embedding_service import (
    generate_embedding,
    MODEL_NAME,
    EMBEDDING_DIMENSION
)

import json


# --------------------------------------------------
# 1. INSERT OR UPDATE KNOWLEDGE DOCUMENT
# --------------------------------------------------

def store_document(
    title: str,
    content: str,
    source: str = None,
    category: str = None,
    metadata: dict = None
):
    """
    Generate an embedding and store the document
    in PostgreSQL knowledge_documents.
    """

    if not title.strip() or not content.strip():
        raise ValueError("Title and content are required")

    # Generate document embedding
    embedding = generate_embedding(
        content,
        task_type="RETRIEVAL_DOCUMENT"
    )

    embedding_string = json.dumps(embedding)

    metadata_string = json.dumps(metadata or {})

    with engine.begin() as connection:

        # Check whether this document already exists
        existing = connection.execute(
            text("""
                SELECT document_id
                FROM knowledge_documents
                WHERE title = :title
                  AND source IS NOT DISTINCT FROM :source
                LIMIT 1
            """),
            {
                "title": title,
                "source": source
            }
        ).scalar_one_or_none()

        if existing is not None:

            # Update existing document
            connection.execute(
                text("""
                    UPDATE knowledge_documents
                    SET content = :content,
                        category = :category,
                        metadata = CAST(:metadata AS jsonb),
                        embedding = CAST(:embedding AS vector(768)),
                        embedding_model = :model
                    WHERE document_id = :document_id
                """),
                {
                    "document_id": existing,
                    "content": content,
                    "category": category,
                    "metadata": metadata_string,
                    "embedding": embedding_string,
                    "model": MODEL_NAME
                }
            )

            return {
                "document_id": existing,
                "status": "updated"
            }

        # Insert new document
        result = connection.execute(
            text("""
                INSERT INTO knowledge_documents (
                    title,
                    content,
                    source,
                    category,
                    metadata,
                    embedding,
                    embedding_model
                )
                VALUES (
                    :title,
                    :content,
                    :source,
                    :category,
                    CAST(:metadata AS jsonb),
                    CAST(:embedding AS vector(768)),
                    :model
                )
                RETURNING document_id
            """),
            {
                "title": title,
                "content": content,
                "source": source,
                "category": category,
                "metadata": metadata_string,
                "embedding": embedding_string,
                "model": MODEL_NAME
            }
        )

        document_id = result.scalar_one()

    return {
        "document_id": document_id,
        "status": "inserted"
    }


# --------------------------------------------------
# 2. SEMANTIC SEARCH
# --------------------------------------------------

def search_documents(
    query: str,
    limit: int = 5,
    category: str = None
):
    """
    Retrieve relevant documents using cosine similarity.
    """

    if not query or not query.strip():
        raise ValueError("Search query cannot be empty")

    if not 1 <= limit <= 20:
        raise ValueError("Limit must be between 1 and 20")

    # Generate query embedding
    query_embedding = generate_embedding(
        query,
        task_type="RETRIEVAL_QUERY"
    )

    embedding_string = json.dumps(query_embedding)

    sql = """
        SELECT
            document_id,
            title,
            content,
            source,
            category,
            metadata,
            1 - (
                embedding <=> CAST(:embedding AS vector(768))
            ) AS similarity

        FROM knowledge_documents

        WHERE embedding IS NOT NULL
          AND (
              CAST(:category AS VARCHAR) IS NULL
              OR category = CAST(:category AS VARCHAR)
          )

        ORDER BY
            embedding <=> CAST(:embedding AS vector(768))

        LIMIT :limit;
    """

    with engine.connect() as connection:

        result = connection.execute(
            text(sql),
            {
                "embedding": embedding_string,
                "category": category,
                "limit": limit
            }
        )

        return [
            dict(row)
            for row in result.mappings().all()
        ]


# --------------------------------------------------
# 3. GET DOCUMENT COUNT
# --------------------------------------------------

def get_document_count():

    with engine.connect() as connection:

        count = connection.execute(
            text("""
                SELECT COUNT(*)
                FROM knowledge_documents
            """)
        ).scalar_one()

    return count
