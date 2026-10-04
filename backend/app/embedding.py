import asyncio
from functools import lru_cache

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


# Re-running a search with a different book filter reuses the same query text,
# so cache it to avoid spending a Gemini call per filter change. lru_cache does
# not cache exceptions, so a quota error is retried on the next call.
# ponytail: per-process cache, swap for a shared cache if we run several workers.
@lru_cache(maxsize=512)
def _embed_cached(text: str) -> tuple[float, ...]:
    # Keep a reference: a garbage-collected genai Client closes its HTTP session mid-call.
    client = _get_client()
    response = client.models.embed_content(
        model=MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=OUTPUT_DIMENSIONALITY,
        ),
    )
    if not response.embeddings:
        raise RuntimeError("Gemini returned no embeddings.")
    return tuple(response.embeddings[0].values)


async def embed_query(text: str) -> list[float]:
    try:
        values = await asyncio.to_thread(_embed_cached, text)
    except Exception as e:
        if _is_rate_limit_error(e):
            raise APIQuotaError(
                "API credits exhausted. Please try again later."
            ) from e
        raise

    return list(values)
