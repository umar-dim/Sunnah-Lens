"""Offline checks for the RAG chat pieces: prompt, stream parsing, rate limit, validation.

    .venv/bin/python scripts/check_chat.py

Uses a mock HTTP transport; no network, no API key needed.
"""
import asyncio
import sys
from pathlib import Path

import httpx
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import chat  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.models import ChatMessage, ChatRequest  # noqa: E402


def msg(role, content):
    return ChatMessage(role=role, content=content)


# --- retrieval_query: last two user turns only ---
thread = [msg("user", "anger"), msg("assistant", "…"), msg("user", "and parents?")]
assert chat.retrieval_query(thread) == "anger\nand parents?"
assert chat.retrieval_query([msg("user", "q")]) == "q"
assert chat.retrieval_query([msg("user", "a"), msg("user", "b"), msg("user", "c")]) == "b\nc"

# --- build_prompt: numbered sources, history trimmed, system first ---
sources = [
    {"collection_id": "bukhari", "collection_name": "Sahih al-Bukhari", "hadith_number": "6116",
     "book_name": "Good Manners", "grade_en": None, "narrator": "Abu Hurairah",
     "matn_en": "Do not become angry.", "text_en": "full"},
    {"collection_id": "tirmidhi", "collection_name": None, "hadith_number": "2020",
     "book_name": None, "grade_en": "Hasan", "narrator": None, "matn_en": None, "text_en": "Text only."},
]
ctx = chat.format_sources(sources)
assert "[1] Sahih al-Bukhari 6116 — Good Manners\nAbu Hurairah: Do not become angry." in ctx, ctx
assert "[2] tirmidhi 2020 — grade: Hasan\nText only." in ctx, ctx

long_thread = [msg("user" if i % 2 == 0 else "assistant", f"m{i}") for i in range(9)]
prompt = chat.build_prompt(long_thread, sources)
assert prompt[0]["role"] == "system" and ctx in prompt[0]["content"]
assert [m["content"] for m in prompt[1:]] == [f"m{i}" for i in range(3, 9)]
assert "(none found)" in chat.build_prompt([msg("user", "q")], [])[0]["content"]
# Old citations are stripped from assistant history, kept in user text.
hist = chat.build_prompt([msg("user", "a [1]"), msg("assistant", "Do not be angry [1][5]."),
                          msg("user", "more")], sources)
assert hist[1]["content"] == "a [1]" and hist[2]["content"] == "Do not be angry.", hist

# --- parse_sse_delta ---
p = chat.parse_sse_delta
assert p('data: {"choices":[{"delta":{"content":"Hi"}}]}') == "Hi"
assert p('data:{"choices":[{"delta":{"content":"x"}}]}') == "x"  # no space after colon
assert p('data: {"choices":[{"delta":{"role":"assistant"}}]}') is None
assert p('data: {"choices":[],"usage":{"total_tokens":5}}') is None
assert p("data: [DONE]") is None
assert p(": keep-alive") is None and p("") is None and p("event: x") is None
assert p("data: not json") is None and p("data: 3") is None
try:
    p('data: {"error":{"message":"overloaded"}}')
    raise AssertionError("expected UpstreamError")
except chat.UpstreamError:
    pass

# --- RateLimiter ---
rl = chat.RateLimiter(limit=10, window=60)
assert all(rl.allow("1.2.3.4", now=t) for t in range(10))
assert not rl.allow("1.2.3.4", now=10)
assert rl.allow("5.6.7.8", now=10)  # other clients unaffected
assert rl.allow("1.2.3.4", now=60.5)  # oldest hit (t=0) has left the window

# --- ChatRequest validation ---
ok = {"messages": [{"role": "user", "content": "q"}]}
ChatRequest(**ok)
for bad in (
    {"messages": []},
    {"messages": [{"role": "assistant", "content": "a"}]},
    {"messages": [{"role": "system", "content": "a"}]},
    {"messages": [{"role": "user", "content": ""}]},
    {"messages": [{"role": "user", "content": "x" * 2001}]},
    {"messages": [{"role": "user", "content": "q"}] * 11},
):
    try:
        ChatRequest(**bad)
        raise AssertionError(f"should reject {bad}")
    except ValidationError:
        pass

# --- stream_answer against a mock provider ---
seen = {}


overloaded = []  # pending 503s to return before streaming


def provider(request: httpx.Request) -> httpx.Response:
    if overloaded:
        overloaded.pop()
        return httpx.Response(503, text='{"error":{"message":"high demand"}}')
    seen["url"] = str(request.url)
    seen["auth"] = request.headers["authorization"]
    seen["body"] = request.read()
    lines = [
        'data: {"choices":[{"delta":{"role":"assistant"}}]}',
        'data: {"choices":[{"delta":{"content":"Do not "}}]}',
        'data: {"choices":[{"delta":{"content":"be angry [1]."}}]}',
        "data: [DONE]",
        'data: {"choices":[{"delta":{"content":"after done"}}]}',
    ]
    return httpx.Response(200, text="\n\n".join(lines))


_RealClient = httpx.AsyncClient
chat.httpx.AsyncClient = lambda **kw: _RealClient(transport=httpx.MockTransport(provider), **kw)
s = get_settings()
s.CHAT_BASE_URL, s.CHAT_API_KEY, s.CHAT_MODEL = "https://llm.test/v1/", "k", "m"


async def collect():
    return [t async for t in chat.stream_answer([msg("user", "anger")], sources)]


assert asyncio.run(collect()) == ["Do not ", "be angry [1]."]
assert seen["url"] == "https://llm.test/v1/chat/completions", seen["url"]
assert seen["auth"] == "Bearer k"
assert b'"stream":true' in seen["body"] and b'"model":"m"' in seen["body"]

# One 503 is retried transparently; two in a row surface as HTTPStatusError.
chat.RETRY_DELAY = 0
overloaded.append(True)
assert asyncio.run(collect()) == ["Do not ", "be angry [1]."]
overloaded.extend([True, True])
try:
    asyncio.run(collect())
    raise AssertionError("expected HTTPStatusError")
except httpx.HTTPStatusError as e:
    assert e.response.status_code == 503

# --- parse_keywords: strip labels, quotes, bullets; one comma-separated line ---
pk = chat.parse_keywords
assert pk('Keywords: "anger", patience\n') == "anger, patience"
assert pk("- anger\n- parents\n* kindness") == "anger, parents, kindness"
assert pk("1. fasting\n2) travel") == "fasting, travel"
assert pk("  \n") == ""
assert pk("<|tool_call_start|>[google(query='fasting')]<|tool_call_end|>") == ""  # junk from free models

# --- extract_keywords: one non-streamed call; any failure falls back to retrieval_query ---
kw = {"reply": None}  # httpx.Response, or an exception to raise


def keyword_provider(request: httpx.Request) -> httpx.Response:
    seen["body"] = request.read()
    if isinstance(kw["reply"], Exception):
        raise kw["reply"]
    return kw["reply"]


def completion(content):
    return httpx.Response(200, json={"choices": [{"message": {"content": content}}]})


chat.httpx.AsyncClient = lambda **kw_: _RealClient(transport=httpx.MockTransport(keyword_provider), **kw_)
follow_up = [msg("user", "anger"), msg("assistant", "Do not be angry [1]."), msg("user", "and with parents?")]

kw["reply"] = completion("Keywords: anger, parents, kindness")
assert asyncio.run(chat.extract_keywords(follow_up)) == "anger, parents, kindness"
body = seen["body"]
assert b'"temperature":0' in body and b'"stream"' not in body, body
assert b"anger" in body and b"and with parents?" in body  # whole thread sent, so follow-ups resolve

for reply in (httpx.Response(500, text="boom"), httpx.ReadTimeout("slow"), completion(""), completion(None),
              httpx.Response(200, text="not json")):
    kw["reply"] = reply
    assert asyncio.run(chat.extract_keywords(follow_up)) == "", reply

# --- search_text: latest question + keywords; no keywords → retrieval_query ---
kw["reply"] = completion("anger, parents")
assert asyncio.run(chat.search_text(follow_up)) == "and with parents?\nanger, parents"
kw["reply"] = httpx.Response(500, text="boom")
assert asyncio.run(chat.search_text(follow_up)) == chat.retrieval_query(follow_up)

print("check ok")
