# Spec: Ask — hadith-grounded AI chat (RAG)

Status: **APPROVED** (2026-10-05) — nav label "Ask"; no similarity floor; provider chosen via `.env` only.

## Objective

Users ask a question in plain words ("what did the Prophet ﷺ say about anger?") and get a short
answer **built only from retrieved hadith**, with every claim cited back to the hadith shown beside it.
This is a new `/chat` page ("Ask"), separate from Free search (`/search`) and text search (`/directory`),
which stay unchanged.

Pipeline per message:

```
user msg ─► embed (existing embed_query, GEMINI_API_KEY)
          ─► pgvector top-k (existing search_hadiths, honours book filter)
          ─► prompt = system rules + numbered hadith context + recent turns
          ─► OpenAI-compatible /chat/completions, stream=true (CHAT_API_KEY)
          ─► SSE to browser: sources first, then answer tokens
```

Decisions taken (2026-10-05):
- **LLM:** any OpenAI-compatible endpoint, configured by `CHAT_BASE_URL` + `CHAT_API_KEY` + `CHAT_MODEL`.
  It uses a separate key from the embedding key (`GEMINI_API_KEY`).
- **Conversation:** multi-turn and stateless. The browser holds the thread and sends recent turns with
  each request. Nothing is written to the DB and there are no accounts. A refresh clears the thread.
- **Streaming:** yes, over SSE.
- **Abuse guard:** an in-memory per-IP rate limit plus caps on input size and turn count.

### User stories / acceptance

1. I ask a question.
   - A stopwatch starts, and a status line changes every 3s ("Searching the six books of hadith…").
   - The hadith used appear above the answer in a collapsed "N hadith used as sources" panel, about 1s in.
   - The answer then streams in. The stopwatch freezes at "Answered in Xs".
2. The answer cites each claim inline by collection and number ("Sahih al-Bukhari 6116"). The model writes
   `[n]`, and the page maps it to the source. Clicking a citation opens the sources, smooth-scrolls to that
   hadith (instant with reduced motion), and highlights it for about 2s.
3. If the retrieved hadith don't address the question, the answer says so plainly. It does not
   answer from general knowledge.
4. I can ask a follow-up ("what about towards parents?") and it uses the earlier context.
5. The existing book filter (collections / sub-books) narrows what the chat draws on.
6. A visible note says answers are AI-generated summaries of the cited hadith, may contain
   mistakes, and are not religious rulings (PRODUCT.md principle 2: "Find, don't rule").
7. If the chat key isn't configured, the rest of the site still works, and `/api/chat` returns a clear 503.

## Tech Stack

Existing stack only:
- **Backend:** FastAPI + asyncpg + pgvector.
- **Frontend:** Next.js 16 / React 19 / Tailwind 4.
- **LLM HTTP calls:** `httpx` (0.28, already installed via google-genai). It will be declared explicitly in
  `pyproject.toml`, and no `openai` SDK is added.
- **Streaming:** FastAPI `StreamingResponse` sends `text/event-stream`. The frontend reads it with `fetch` +
  `ReadableStream`, because `EventSource` can't POST.

## API

`POST /api/chat`

```jsonc
// request
{
  "messages": [                      // oldest → newest, last must be role "user"
    {"role": "user", "content": "What did the Prophet ﷺ say about anger?"},
    {"role": "assistant", "content": "…"},
    {"role": "user", "content": "And towards parents?"}
  ],
  "collection_ids": null,            // same FilterFields as /api/search
  "book_ids": null
}
```

Validation:
- `messages`: 1–10 items.
- Each `content`: 1–2000 chars.
- `role` must be `user` or `assistant`.
- The last message must be `user`.
- Anything else → 422.

Response (`text/event-stream`), in order:

```
event: sources   data: {"results": [HadithResult, …]}     // exactly once, before any delta
event: delta     data: {"text": "…"}                       // 0..n
event: done      data: {}
event: error     data: {"message": "…", "code": "quota" | "upstream"}   // instead of done
```

Other errors:
- 429: rate limit hit, or embedding quota exhausted. This happens before the stream opens.
- 503: chat not configured.

### Pipeline details

- **Retrieval query:** the last user message, joined with the previous user message when there is one.
  This keeps short follow-ups on topic.
  `ponytail:` naive. The upgrade path is an LLM query-rewrite step if follow-up retrieval proves weak.
- **top_k:** 8.
- **Context:** each hadith becomes a numbered block:
  `[n] {collection_name} {hadith_number} — {book_name} — grade: {grade_en}`, followed by
  narrator and `matn_en` (falling back to `text_en`).
  Arabic text is left out of the prompt to save tokens. It is still shown on the cards.
- **History sent to the LLM:** the last 6 messages. Older turns are dropped.
- **System prompt rules:**
  - Answer only from the numbered hadith.
  - Cite each claim as `[n]`.
  - If the hadith don't cover the question, say so.
  - Only restate what the hadith say; no added interpretation (added 2026-10-05 after a misreading in testing).
  - Never issue rulings or judge authenticity beyond the recorded grade.
  - Use ﷺ after the Prophet's name and ﷻ after Allah's.
  - Decline off-topic requests.
  - Write plain paragraphs, with no markdown headings or tables.
- **Upstream call:** `POST {CHAT_BASE_URL}/chat/completions` with `{model, messages, stream: true,
  temperature: 0.2}` and header `Authorization: Bearer {CHAT_API_KEY}`. The code parses `data:` lines
  and stops on `[DONE]`. The 60s timeout applies to each read, not the whole call (accepted).
- **Rate limit:** 10 requests per minute per client IP, keyed on Cloudflare's `CF-Connecting-IP`
  (Render sits behind Cloudflare) and falling back to the peer address. `X-Forwarded-For` isn't used because
  its first hop is client-controlled. It is an in-memory sliding window.
  `ponytail:` per-process. Move to Redis/DB if we run several workers.

## Config

`backend/.env` / `.env.example`:

```
CHAT_BASE_URL=https://api.openai.com/v1     # any OpenAI-compatible base URL
CHAT_API_KEY=
CHAT_MODEL=gpt-4o-mini
```

All three are optional in `Settings`. If any is missing, `/api/chat` → 503 and nothing else changes.

## Commands

```
Backend dev:   cd backend && .venv/bin/python -m uvicorn app.main:app --port 8000
Frontend dev:  cd frontend && npm run dev            # must be port 3000 (CORS)
Lint/types:    cd frontend && npm run lint && npx tsc --noEmit
Offline check: cd backend && .venv/bin/python scripts/check_chat.py
Smoke (live):  cd backend && .venv/bin/python scripts/smoke_chat.py [base_url]   # costs 1 embed + 1 LLM call
```

## Project Structure

```
backend/app/chat.py           NEW  prompt building, upstream streaming call, rate limiter
backend/app/models.py         + ChatMessage, ChatRequest
backend/app/config.py         + CHAT_BASE_URL / CHAT_API_KEY / CHAT_MODEL (optional)
backend/app/main.py           + POST /api/chat (SSE)
backend/.env.example          + chat vars
backend/pyproject.toml        + httpx (explicit)
backend/scripts/check_chat.py NEW  offline asserts: prompt/context builder, SSE line parser, rate limiter, validation
backend/scripts/smoke_chat.py NEW  live: one question → sources then deltas then done; 422 on bad input
frontend/app/chat/page.tsx    NEW  thread UI, input, BookFilter, source cards, disclaimer
frontend/app/chat/layout.tsx  NEW  metadata (mirrors search/layout.tsx)
frontend/lib/api.ts           + streamChat() (fetch + ReadableStream SSE reader)
frontend/lib/types.ts         + ChatMessage, chat event types
frontend/components/Navbar.tsx + "Ask" link
PRODUCT.md                    + /chat under Operating Context
```

The frontend reuses `HadithCard` / `HadithList` and `BookFilter`. No new UI components unless one is
clearly needed.

## Code Style

Match the existing code:
- SQL and helpers live in modules, and `main.py` stays thin.
- `ponytail:` comments mark known ceilings.
- Frontend pages are `"use client"` with `useState`/`useRef`, plus a sequence guard so only the latest
  request writes state (see `app/search/page.tsx`).
- Styling follows DESIGN.md tokens.

```python
async def stream_answer(messages: list[dict], sources: list[dict]) -> AsyncIterator[str]:
    s = get_settings()
    body = {"model": s.CHAT_MODEL, "messages": build_prompt(messages, sources),
            "stream": True, "temperature": 0.2}
    async with httpx.AsyncClient(timeout=60) as client:
        async with client.stream("POST", f"{s.CHAT_BASE_URL}/chat/completions", json=body,
                                 headers={"Authorization": f"Bearer {s.CHAT_API_KEY}"}) as r:
            r.raise_for_status()
            async for line in r.aiter_lines():
                if text := parse_sse_delta(line):
                    yield text
```

## Testing Strategy

The repo has no test framework, so this follows the existing `scripts/check_*.py` / `smoke_*.py` pattern:
plain `assert`s, run directly.
- **`check_chat.py` (offline, free):**
  - The context builder numbers sources and includes the references.
  - History is trimmed to 6 messages.
  - `parse_sse_delta` handles content, empty deltas, `[DONE]`, and junk lines.
  - The rate limiter allows 10 requests and then blocks.
  - `ChatRequest` rejects a last message that isn't `user`, >10 messages, and empty content.
- **`smoke_chat.py` (live API + key):**
  - Event order is `sources` → ≥1 `delta` → `done`.
  - The answer contains at least one `[n]` with n ≤ the number of sources.
  - A filtered request only returns sources from that collection.
  - 422 on bad input.
  - 503 path checked by running with the key unset (manual).
- **Frontend:**
  - `npm run lint` + `tsc` pass.
  - Manual browser check via chrome-devtools on :3000 covering:
    - streaming renders progressively
    - citations link to cards
    - follow-up works
    - filter applies
    - error states (429, 503) show a friendly message
    - mobile width

## Boundaries

- **Always:**
  - Every answer is shown next to its source cards.
  - Prompt the model to cite only from the provided hadith.
  - Keep the "AI-generated, not a ruling" note visible.
  - Validate input at the API boundary.
  - Run `check_chat.py` and the frontend lint/tsc before committing.
- **Ask first:**
  - Adding the `openai` SDK or any other dependency.
  - Any DB schema change, including persisting chats.
  - Changing `/api/search` or `/api/search/text` behaviour.
  - Changing the system prompt's rules after approval.
- **Never:**
  - Commit `CHAT_API_KEY` or `.env`.
  - Send the key to the browser. All LLM calls go server-side.
  - Write to the cloud DB.
  - Let the model answer without retrieved sources.
  - Fabricate references or grades.

## Success Criteria

- [x] `POST /api/chat` streams `sources` → `delta`* → `done` for a valid request, and `smoke_chat.py` passes.
- [x] First `sources` event arrives in < 2s locally (embed + vector search). The first `delta` time depends
      on the provider, so it is reported but not gated.
- [x] Answers cite with `[n]`, and every marker maps to a shown hadith card.
- [x] An off-corpus question ("what's the capital of France?") is declined, not answered.
- [x] Book filter restricts sources.
- [x] 11th request in a minute from one IP → 429. Bad input → 422. Missing key → 503, and `/search` + `/directory` still work.
- [x] `check_chat.py`, `smoke_search.py`, `npm run lint`, and `tsc` all pass.
- [x] The `/chat` page works at mobile width, renders Arabic correctly on cards, and shows the disclaimer.

## Review notes (2026-10-05)

Accepted, not fixed:
- A client can make up `assistant` turns to steer the model. The impact is low: there are no tools,
  only the requester sees the output, and only the last 6 messages are sent.
- The 60s timeout is per read, so a provider that sends tokens slowly can hold a stream open longer.

## Open Questions

1. **Default model / provider for production:** which base URL + model will you deploy with?
   This affects only `.env`, not code.
2. **Similarity floor:** if every retrieved hadith scores below about 0.5 similarity, should we skip the
   LLM call and return "no relevant hadith found" (saves cost)? The default is no: always call, and let the
   prompt handle it.
3. **Nav label:** "Ask" or "Chat"?
