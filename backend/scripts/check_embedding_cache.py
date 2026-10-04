"""Check that query embeddings are cached and quota errors are not.

    .venv/bin/python scripts/check_embedding_cache.py

Uses a fake Gemini client; no network, no API key needed.
"""
import asyncio
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import embedding  # noqa: E402

calls = []
fail_next = []


def fake_embed_content(model, contents, config):
    calls.append(contents)
    if fail_next:
        fail_next.pop()
        raise Exception("429 RESOURCE_EXHAUSTED")
    return SimpleNamespace(embeddings=[SimpleNamespace(values=[0.1, 0.2])])


embedding._get_client = lambda: SimpleNamespace(
    models=SimpleNamespace(embed_content=fake_embed_content)
)


async def main():
    # Same text twice → one API call.
    assert await embedding.embed_query("patience") == [0.1, 0.2]
    assert await embedding.embed_query("patience") == [0.1, 0.2]
    assert calls.count("patience") == 1, calls

    # Quota error is raised as APIQuotaError and not cached: the retry calls again.
    fail_next.append(True)
    try:
        await embedding.embed_query("charity")
        raise AssertionError("expected APIQuotaError")
    except embedding.APIQuotaError:
        pass
    assert await embedding.embed_query("charity") == [0.1, 0.2]
    assert calls.count("charity") == 2, calls


asyncio.run(main())
print("embedding cache ok")
