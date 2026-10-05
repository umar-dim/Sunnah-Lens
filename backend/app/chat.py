"""RAG chat: build a prompt from retrieved hadith and stream an OpenAI-compatible completion."""
from __future__ import annotations

import asyncio
import json
import re
import time
from collections import deque
from collections.abc import AsyncIterator

import httpx

from app.config import get_settings
from app.models import ChatMessage

TOP_K = 8
HISTORY = 6  # most recent messages sent to the LLM
RETRY_DELAY = 1.5  # seconds before retrying an overloaded (503) provider

SYSTEM_PROMPT = """You are SUNNAH LENS, an assistant that answers questions using ONLY the numbered hadith below, \
taken from the six canonical collections (Kutub al-Sittah).

Rules:
- Base every statement on the numbered hadith. Cite each one you use inline as [n], e.g. [2] or [1][3].
- Only restate what the hadith say. Do not add your own interpretation, conclusions, or lessons.
- If the hadith below do not address the question, reply with exactly NOT_COVERED and nothing else. \
Do not answer from general knowledge.
- Do not issue religious rulings (fatwas) or judge authenticity; mention a grade only as recorded.
- Write ﷺ after the Prophet's name and ﷻ after Allah's.
- For requests unrelated to the hadith or Islamic teachings, also reply with exactly NOT_COVERED.
- Never mention "the provided", "retrieved" or "numbered" hadith; state what the hadith say and cite them.
- Be concise. Write plain paragraphs: no markdown headings, tables, or bold."""


class UpstreamError(Exception):
    """The LLM provider returned an error inside an otherwise successful stream."""


def retrieval_query(messages: list[ChatMessage]) -> str:
    # ponytail: joins the last two user turns so short follow-ups stay on topic;
    # add an LLM query-rewrite step if follow-up retrieval proves weak.
    users = [m.content for m in messages if m.role == "user"]
    return "\n".join(users[-2:])


def format_sources(sources: list[dict]) -> str:
    blocks = []
    for n, h in enumerate(sources, 1):
        head = f"[{n}] {h.get('collection_name') or h['collection_id']} {h['hadith_number']}"
        if h.get("book_name"):
            head += f" — {h['book_name']}"
        if h.get("grade_en"):
            head += f" — grade: {h['grade_en']}"
        body = h.get("matn_en") or h.get("text_en") or ""
        if h.get("narrator"):
            body = f"{h['narrator']}: {body}"
        blocks.append(f"{head}\n{body.strip()}")
    return "\n\n".join(blocks)


def build_prompt(messages: list[ChatMessage], sources: list[dict]) -> list[dict]:
    system = f"{SYSTEM_PROMPT}\n\nHadith:\n\n{format_sources(sources) or '(none found)'}"
    # Earlier answers' [n] pointed at earlier sources; strip them so the model can't
    # carry an old citation over onto this turn's (different) numbered hadith.
    return [{"role": "system", "content": system}] + [
        {"role": m.role,
         "content": re.sub(r"\s*\[\d+\]", "", m.content) if m.role == "assistant" else m.content}
        for m in messages[-HISTORY:]
    ]


def parse_sse_delta(line: str) -> str | None:
    """Text from one `data:` line of an OpenAI-style stream, or None if it carries none."""
    if not line.startswith("data:"):
        return None
    payload = line[5:].strip()
    if not payload or payload == "[DONE]":
        return None
    try:
        chunk = json.loads(payload)
    except json.JSONDecodeError:
        return None
    if not isinstance(chunk, dict):
        return None
    if chunk.get("error"):
        raise UpstreamError(str(chunk["error"]))
    choices = chunk.get("choices") or []  # usage-only chunks have none
    if not choices:
        return None
    return (choices[0].get("delta") or {}).get("content") or None


async def stream_answer(messages: list[ChatMessage], sources: list[dict]) -> AsyncIterator[str]:
    s = get_settings()
    body = {
        "model": s.CHAT_MODEL,
        "messages": build_prompt(messages, sources),
        "stream": True,
        "temperature": 0.2,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        for attempt in range(2):
            async with client.stream(
                "POST",
                f"{s.CHAT_BASE_URL.rstrip('/')}/chat/completions",
                json=body,
                headers={"Authorization": f"Bearer {s.CHAT_API_KEY}"},
            ) as r:
                # Overloaded providers (Gemini 503 "high demand") often succeed a second
                # later; retry once. Safe because nothing has been yielded yet.
                if r.status_code == 503 and attempt == 0:
                    await asyncio.sleep(RETRY_DELAY)
                    continue
                r.raise_for_status()
                async for line in r.aiter_lines():
                    if line.strip() == "data: [DONE]":
                        break
                    if text := parse_sse_delta(line):
                        yield text
                return


class RateLimiter:
    """Sliding window: at most `limit` hits per `window` seconds per key."""

    # ponytail: per-process memory; move to Redis/DB if we run several workers.
    def __init__(self, limit: int = 10, window: float = 60):
        self.limit = limit
        self.window = window
        self.hits: dict[str, deque[float]] = {}

    def allow(self, key: str, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        cutoff = now - self.window
        if len(self.hits) > 10_000:  # drop idle clients so memory stays bounded
            self.hits = {k: q for k, q in self.hits.items() if q and q[-1] > cutoff}
        q = self.hits.setdefault(key, deque())
        while q and q[0] <= cutoff:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        return True
