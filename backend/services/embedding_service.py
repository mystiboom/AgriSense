
import os
import math
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types


# Load backend/.env
BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY not found in backend/.env")


# Gemini configuration
MODEL_NAME = "gemini-embedding-001"
EMBEDDING_DIMENSION = 768

client = genai.Client(api_key=API_KEY)


def generate_embedding(
    text: str,
    task_type: str = "RETRIEVAL_DOCUMENT"
) -> list[float]:

    """
    Generate a normalized 768-dimensional embedding.

    RETRIEVAL_DOCUMENT: For documents stored in PostgreSQL.
    RETRIEVAL_QUERY: For user questions.
    """

    if not text or not text.strip():
        raise ValueError("Input text cannot be empty")

    response = client.models.embed_content(
        model=MODEL_NAME,
        contents=text,
        config=types.EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=EMBEDDING_DIMENSION
        )
    )

    embedding = response.embeddings[0].values

    if len(embedding) != EMBEDDING_DIMENSION:
        raise ValueError(
            f"Expected {EMBEDDING_DIMENSION} dimensions, "
            f"got {len(embedding)}"
        )

    # Normalize vector
    magnitude = math.sqrt(sum(x * x for x in embedding))

    if magnitude == 0:
        raise ValueError("Generated embedding has zero magnitude")

    normalized = [
        float(x / magnitude)
        for x in embedding
    ]

    return normalized


def close_embedding_client():
    """Close Gemini client when the application shuts down."""
    client.close()
