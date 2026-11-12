
import os
import json
import re
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from sqlalchemy import text

from database import engine
from services.vector_store import search_documents


# --------------------------------------------------
# CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY not found in backend/.env")

GEMINI_MODEL = "gemini-3.5-flash-lite"

client = genai.Client(api_key=API_KEY)


# --------------------------------------------------
# 1. REGION RESOLUTION
# --------------------------------------------------

def get_all_regions():
    query = """
        SELECT region_id, region_name, region_level, parent_region_id
        FROM regions
        ORDER BY region_id;
    """

    with engine.connect() as connection:
        result = connection.execute(text(query))

        return [
            dict(row)
            for row in result.mappings().all()
        ]


def resolve_region_ids(question, region_id=None, conversation_history=None):
    """
    Identify the relevant fields using:
    1. Explicit field names in the current question.
    2. Previous user messages for follow-up references.
    3. The region_id supplied by the API.
    4. Hierarchical region relationships.
    """

    regions = get_all_regions()

    if not regions:
        return []

    region_by_id = {
        int(region["region_id"]): region
        for region in regions
    }

    question_lower = question.lower()

    # Find region names explicitly mentioned in the current question.
    current_matches = []

    for region in regions:
        name = region["region_name"]

        pattern = (
            r"(?<!\w)"
            + re.escape(name.lower())
            + r"(?!\w)"
        )

        if re.search(pattern, question_lower):
            current_matches.append(int(region["region_id"]))

    # Collect previous user messages.
    previous_user_text = ""

    if conversation_history:
        previous_messages = [
            message.get("content", "")
            for message in conversation_history
            if message.get("role", "").lower() == "user"
        ]

        previous_user_text = " ".join(previous_messages[-5:]).lower()

    # Detect references to previously discussed entities.
    reference_pattern = (
        r"\b(it|its|they|their|that|those|this|"
        r"there|same|previous|former|latter)\b"
    )

    has_reference = bool(
        re.search(reference_pattern, question_lower)
    )

    comparison_pattern = (
        r"\b(compare|comparison|versus|vs\.?|against)\b"
    )

    is_comparison = bool(
        re.search(comparison_pattern, question_lower)
    )

    selected_region_ids = set()

    # Case 1: Current question explicitly mentions region names.
    if current_matches:

        selected_region_ids.update(current_matches)

        # For questions such as:
        # "Compare its nitrogen with Field S2"
        # preserve the previous field represented by "its".
        if has_reference and region_id is not None:
            selected_region_ids.add(int(region_id))

        # Also retain previously discussed fields for comparisons.
        if is_comparison and conversation_history:

            for region in regions:
                pattern = (
                    r"(?<!\w)"
                    + re.escape(region["region_name"].lower())
                    + r"(?!\w)"
                )

                if re.search(pattern, previous_user_text):
                    selected_region_ids.add(
                        int(region["region_id"])
                    )

    else:
        # Case 2: Follow-up without an explicit region name.
        if has_reference and conversation_history:

            for region in regions:
                pattern = (
                    r"(?<!\w)"
                    + re.escape(region["region_name"].lower())
                    + r"(?!\w)"
                )

                if re.search(pattern, previous_user_text):
                    selected_region_ids.add(
                        int(region["region_id"])
                    )

        # Use the API region as a fallback.
        if not selected_region_ids and region_id is not None:
            selected_region_ids.add(int(region_id))

    # If nothing could be resolved, retrieve all fields.
    if not selected_region_ids:
        return None

    # Remove IDs that do not exist.
    selected_region_ids = {
        rid for rid in selected_region_ids
        if rid in region_by_id
    }

    if not selected_region_ids:
        return None

    # Expand districts and blocks to their descendant fields.
    hierarchy_query = """
        WITH RECURSIVE descendants AS (
            SELECT region_id, region_level
            FROM regions
            WHERE region_id = ANY(:root_ids)

            UNION ALL

            SELECT child.region_id, child.region_level
            FROM regions child
            JOIN descendants parent
                ON child.parent_region_id = parent.region_id
        )
        SELECT DISTINCT region_id
        FROM descendants
        WHERE region_level = 'field';
    """

    with engine.connect() as connection:
        result = connection.execute(
            text(hierarchy_query),
            {"root_ids": list(selected_region_ids)}
        )

        field_ids = [
            int(row["region_id"])
            for row in result.mappings().all()
        ]

    return field_ids or None


# --------------------------------------------------
# 2. RETRIEVE LIVE AGRICULTURAL DATA
# --------------------------------------------------

def get_live_agricultural_data(region_ids=None):

    query = """
        WITH latest_crop AS (
            SELECT DISTINCT ON (region_id)
                region_id,
                crop_type,
                observed_at,
                ndvi,
                evi,
                stress_score,
                stress_level
            FROM crop_observations
            ORDER BY region_id, observed_at DESC
        ),

        latest_weather AS (
            SELECT DISTINCT ON (region_id)
                region_id,
                recorded_at,
                rainfall_mm,
                temperature_c,
                humidity_pct,
                wind_speed
            FROM weather_records
            ORDER BY region_id, recorded_at DESC
        ),

        latest_soil AS (
            SELECT DISTINCT ON (region_id)
                region_id,
                recorded_at,
                soil_moisture_pct,
                soil_ph,
                nitrogen,
                phosphorus,
                potassium
            FROM soil_records
            ORDER BY region_id, recorded_at DESC
        )

        SELECT
            r.region_id,
            r.region_name,

            c.crop_type,
            c.observed_at,
            c.ndvi,
            c.evi,
            c.stress_score,
            c.stress_level,

            w.recorded_at AS weather_recorded_at,
            w.rainfall_mm,
            w.temperature_c,
            w.humidity_pct,
            w.wind_speed,

            s.recorded_at AS soil_recorded_at,
            s.soil_moisture_pct,
            s.soil_ph,
            s.nitrogen,
            s.phosphorus,
            s.potassium

        FROM regions r

        LEFT JOIN latest_crop c
            ON r.region_id = c.region_id

        LEFT JOIN latest_weather w
            ON r.region_id = w.region_id

        LEFT JOIN latest_soil s
            ON r.region_id = s.region_id

        WHERE
            r.region_level = 'field'
            AND (
                CAST(:region_ids AS BIGINT[]) IS NULL
                OR r.region_id = ANY(
                    CAST(:region_ids AS BIGINT[])
                )
            )

        ORDER BY r.region_name;
    """

    with engine.connect() as connection:

        result = connection.execute(
            text(query),
            {"region_ids": region_ids}
        )

        return [
            dict(row)
            for row in result.mappings().all()
        ]


# --------------------------------------------------
# 3. BUILD CONTEXTUAL RETRIEVAL QUERY
# --------------------------------------------------

def build_retrieval_query(question, conversation_history=None):

    retrieval_query = question

    if conversation_history:

        previous_user_questions = [
            message["content"]
            for message in conversation_history
            if message.get("role", "").lower() == "user"
        ][-2:]

        if previous_user_questions:

            retrieval_query = (
                "Previous user questions: "
                + " | ".join(previous_user_questions)
                + "\nCurrent question: "
                + question
            )

    return retrieval_query


# --------------------------------------------------
# 4. BUILD RAG CONTEXT
# --------------------------------------------------

def build_context(question, region_ids=None, top_k=5):

    documents = search_documents(
        query=question,
        limit=top_k
    )

    live_data = get_live_agricultural_data(region_ids)

    context_parts = []

    # Knowledge document context
    for index, document in enumerate(documents, start=1):

        context_parts.append(
            f"""
KNOWLEDGE DOCUMENT {index}

Title: {document['title']}
Category: {document['category']}
Similarity: {float(document['similarity']):.4f}

Content:
{document['content']}
"""
        )

    # Live database context
    if live_data:

        context_parts.append(
            "LATEST AGRICULTURAL DATABASE OBSERVATIONS:\n"
            + json.dumps(live_data, indent=2, default=str)
        )

    return {
        "context": "\n\n".join(context_parts),
        "documents": documents,
        "live_data": live_data
    }


# --------------------------------------------------
# 5. GENERATE RAG ANSWER
# --------------------------------------------------

def generate_rag_answer(
    question,
    region_id=None,
    top_k=5,
    conversation_history=None
):

    if not question or not question.strip():
        raise ValueError("Question cannot be empty")

    # A. Build contextual retrieval query
    retrieval_query = build_retrieval_query(
        question=question,
        conversation_history=conversation_history
    )

    # B. Resolve relevant regions and fields
    resolved_region_ids = resolve_region_ids(
        question=question,
        region_id=region_id,
        conversation_history=conversation_history
    )

    # C. Retrieve RAG context
    rag_data = build_context(
        question=retrieval_query,
        region_ids=resolved_region_ids,
        top_k=top_k
    )

    context = rag_data["context"]

    if not context:
        context = "No relevant agricultural information was found."

    # D. Build conversation history
    history_text = "No previous conversation."

    if conversation_history:

        history_parts = []

        for message in conversation_history:

            role = message["role"].upper()
            content = message["content"]

            history_parts.append(
                f"{role}: {content}"
            )

        history_text = "\n\n".join(history_parts)

    # E. Build Gemini prompt
    prompt = f"""
You are AgriSense, an agricultural intelligence assistant.

Your job is to help farmers understand crop health,
soil conditions, weather conditions and agricultural problems.

USER QUESTION:
{question}

PREVIOUS CONVERSATION:
{history_text}

CONVERSATION INSTRUCTIONS:

1. Use previous messages to understand follow-up questions.
2. Resolve references such as "it", "its", "that field"
   and "the previous one" using conversation history.
3. Maintain the previously discussed field when appropriate.
4. If multiple fields are mentioned, consider all relevant fields.
5. If the user asks for a comparison, compare the actual
   database observations of both fields.
6. Never claim that a field has no data if its observations
   are present in the supplied agricultural context.
7. If a field is not present in the supplied context,
   explicitly mention that its data is unavailable.
8. Do not treat previous AI-generated recommendations
   as verified database observations.

AGRICULTURAL CONTEXT:
{context}

AGRICULTURAL RESPONSE INSTRUCTIONS:

1. Answer using the supplied agricultural context.
2. Prioritize actual database observations when available.
3. Do not invent measurements, values or observations.
4. If information is unavailable, explicitly mention it.
5. Explain technical agricultural terms in simple language.
6. Provide practical recommendations where appropriate.
7. Distinguish observed facts from possible causes.
8. Never claim a diagnosis is certain based on insufficient data.
9. Never assume measurement units that are not explicitly
   provided in the database.
10. Do not interpret nutrient values as percentages unless
    their units are confirmed.
11. Clearly distinguish measured observations from
    inferred agricultural explanations.
12. Do not reuse outdated measurements from previous
    AI responses when newer database observations exist.
13. For comparisons, use the same parameter and latest
    available records for each field.
14. If the database does not contain sufficient information,
    clearly state the limitation.

RESPONSE STRUCTURE:

- Direct answer
- Relevant observations
- Comparison, if requested
- Possible causes
- Recommended actions

Keep the answer clear and useful for farmers.
"""

    # F. Generate Gemini response
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt
    )

    answer = response.text

    if not answer:
        raise RuntimeError("Gemini returned an empty response")

    # G. Prepare source attribution
    sources = []

    for document in rag_data["documents"]:

        sources.append({
            "document_id": document["document_id"],
            "title": document["title"],
            "category": document["category"],
            "source": document["source"],
            "similarity": round(
                float(document["similarity"]), 4
            )
        })

    # H. Return response
    return {
        "question": question,
        "answer": answer,
        "sources": sources,
        "live_data": rag_data["live_data"]
    }


# --------------------------------------------------
# 6. CLOSE GEMINI CLIENT
# --------------------------------------------------

def close_rag_client():
    client.close()
