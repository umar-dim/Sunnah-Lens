import asyncio
from functools import partial

from google import genai
from google.genai import types

from app.config import get_settings

MODEL = "gemini-embedding-001"
OUTPUT_DIMENSIONALITY = 1536


def _get_client() -> genai.Client:
    settings = get_settings()
    return genai.Client(api_key=settings.GEMINI_API_KEY)


async def embed_query(text: str) -> list[float]:
    client = _get_client()

    response = await asyncio.to_thread(
        client.models.embed_content,
        model=MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=OUTPUT_DIMENSIONALITY,
        ),
    )

    if not response.embeddings:
        raise RuntimeError("Gemini returned no embeddings.")

    return response.embeddings[0].values
