import asyncio
from functools import partial

from google import genai
from google.genai import types

from app.config import get_settings

MODEL = "gemini-embedding-001"
OUTPUT_DIMENSIONALITY = 1536


class APIQuotaError(Exception):
    """Raised when Gemini API credits are exhausted or rate limited."""
    pass


def _is_rate_limit_error(error: Exception) -> bool:
    """Check if the error is a rate limit or quota exhaustion error."""
    error_text = str(error).lower()
    rate_limit_indicators = [
        "429",
        "resource_exhausted",
        "resource exhausted",
        "rate limit",
        "quota exceeded",
        "too many requests",
    ]
    return any(indicator in error_text for indicator in rate_limit_indicators)


def _get_client() -> genai.Client:
    settings = get_settings()
    return genai.Client(api_key=settings.GEMINI_API_KEY)


async def embed_query(text: str) -> list[float]:
    client = _get_client()

    try:
        response = await asyncio.to_thread(
            client.models.embed_content,
            model=MODEL,
            contents=text,
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_QUERY",
                output_dimensionality=OUTPUT_DIMENSIONALITY,
            ),
        )
    except Exception as e:
        if _is_rate_limit_error(e):
            raise APIQuotaError(
                "API credits exhausted. Please try again later."
            ) from e
        raise

    if not response.embeddings:
        raise RuntimeError("Gemini returned no embeddings.")

    return response.embeddings[0].values
