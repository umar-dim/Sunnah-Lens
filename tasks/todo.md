# TODO: Ask — AI chat (see tasks/plan.md, SPEC-chat.md)

- [x] **T1 — backend core (pure)**
  - Acceptance:
    - `Settings` has optional `CHAT_BASE_URL/CHAT_API_KEY/CHAT_MODEL`.
    - `ChatMessage`/`ChatRequest` validate per spec: 1–10 messages, 1–2000 chars each,
      `role` ∈ {user, assistant}, last message `user`, `FilterFields` inherited.
    - `chat.py` has `retrieval_query`, `build_prompt`, `parse_sse_delta`, `RateLimiter`, `stream_answer`.
  - Verify: `cd backend && .venv/bin/python scripts/check_chat.py` → "check ok", with no network.
  - Files: `app/config.py`, `app/models.py`, `app/chat.py`, `scripts/check_chat.py`

- [x] **T2 — `/api/chat` endpoint** (depends on T1)
  - Acceptance:
    - 503 if unconfigured.
    - 429 from the limiter (10/min/IP) and from embedding quota.
    - 422 on bad input.
    - Otherwise SSE `sources` → `delta`* → `done`. An upstream failure → `error` event.
    - The filter is honoured.
  - Verify:
    - `scripts/smoke_chat.py` passes against the local API with a real key.
    - `curl -N` shows incremental deltas.
    - `smoke_search.py` still passes.
  - Files: `app/main.py`, `.env.example`, `pyproject.toml` (+httpx), `scripts/smoke_chat.py`

- [x] **Checkpoint A** — backend done. Report curl output before starting the frontend.

- [x] **T3 — frontend client** (depends on T2)
  - Acceptance: types for chat messages and events. `streamChat(messages, filter, handlers, signal)`
    parses SSE and maps 429/503 to friendly errors.
  - Verify: `npm run lint && npx tsc --noEmit`.
  - Files: `lib/types.ts`, `lib/api.ts`

- [x] **T4 — `/chat` page + nav** (depends on T3)
  - Acceptance:
    - The thread renders and streams progressively.
    - Each assistant turn shows its source cards (`HadithCard`).
    - `[n]` links to `#source-n`.
    - `BookFilter` applies.
    - The disclaimer is visible.
    - A new question aborts the in-flight one.
    - The input is disabled while streaming.
    - "Ask" is in the nav.
    - Layout metadata mirrors `search/layout.tsx`.
  - Verify: lint/tsc/build, then a chrome-devtools pass on :3000 covering streaming, citations, follow-up,
    filter, 429/503 messages, mobile width, and Arabic on the cards.
  - Files: `app/chat/page.tsx`, `app/chat/layout.tsx`, `components/Navbar.tsx`

- [x] **T5 — docs + review** (depends on T4)
  - Acceptance:
    - PRODUCT.md Operating Context lists `/chat`.
    - The spec success criteria are all ticked.
    - A code review (code-reviewer agent) finds no blocking issues.
  - Files: `PRODUCT.md`, `SPEC-chat.md`

- [x] **T6 — sources above answer, collapsed; citation chips that open, scroll and highlight**
  - Acceptance:
    - Each turn renders question → `<details>` sources (collapsed, "N hadith used as sources") → answer.
    - `[n]` renders as a button labelled "{collection_name} {hadith_number}". An invalid `n` stays plain text.
    - Clicking opens that turn's sources, smooth-scrolls the card to centre (instant with reduced motion),
      and rings/tints it for about 2s. Rapid clicks restart the timer.
  - Verify:
    - lint + tsc.
    - chrome-devtools on :3000: collapsed by default; click chip → panel open, card in viewport, highlight
      class present then gone after about 2s; keyboard (Tab + Enter) works; 375px wraps cleanly.
  - Files: `frontend/app/chat/page.tsx`

- [x] **T7 — stopwatch + rotating status line** (depends on T6, same file)
  - Acceptance:
    - The stopwatch starts on submit and ticks while streaming. It freezes at done/error, showing
      "Answered in Xs" or "Stopped after Xs".
    - The status message changes every 3s until the first answer text arrives.
    - The interval is cleared on finish and unmount. The timer isn't inside the `aria-live` region.
  - Verify:
    - lint + tsc.
    - Browser: sample the status text at 0s/3.5s/7s and confirm it changed; the timer stops after done; no
      console errors; "New" mid-stream leaves no running interval.
  - Files: `frontend/app/chat/page.tsx`

- [x] **T8 — docs** (depends on T7)
  - Acceptance: SPEC-chat.md user stories 1–2 describe the new layout and citation format.
  - Files: `SPEC-chat.md`

- [ ] **Checkpoint C** — lint/tsc/build green; full browser pass (desktop + 375px, reduced motion); then
  Checkpoint B below.

- [ ] **Checkpoint B** — all checks green. You do a manual click-through, then commit.

---

# TODO: Keyword query step (see tasks/plan.md, "Keyword query step")

- [x] **K1 — `extract_keywords` (backend, pure + one I/O call)**
  - Description: add `KEYWORD_PROMPT` and `extract_keywords(messages) -> str` to `app/chat.py`.
    It makes a non-streamed `/chat/completions` call (temperature 0, timeout 10s) using the last `HISTORY` messages.
    A small `parse_keywords(text)` strips labels, quotes and bullets and joins the result into one line.
    Any exception or empty result → returns `retrieval_query(messages)`.
  - Acceptance:
    - A follow-up thread ("anger" → "and with parents?") produces one standalone keyword line.
    - A provider 500, a timeout, and empty content each return the `retrieval_query` output.
    - `parse_keywords("Keywords: \"anger\", patience\n")` → `"anger, patience"`.
  - Verify: `cd backend && .venv/bin/python scripts/check_chat.py`, with new asserts using the existing
    MockTransport pattern.
  - Depends on: none
  - Files: `backend/app/chat.py`, `backend/scripts/check_chat.py`
  - Scope: S

- [x] **K2 — measure what to embed (decision gate)**
  - Description: a throwaway script. For about 10 questions from `frontend/lib/questions.ts` plus 3 follow-up
    threads, print the top-8 hadith refs and similarities for three variants: (a) the current
    `retrieval_query`, (b) keywords only, (c) question + keywords. Read the results and pick the variant.
  - Acceptance: the chosen variant and a one-line reason are recorded here. If (a) wins, stop and rethink.
  - **Result (2026-10-06): (c) question + keywords.** Best or tied on 12/13 cases. It's clearly better than (a) on
    follow-ups ("anger" → "with parents?" pulls parent hadith, not general anger) and on vague
    questions ("anything about dogs", "brother insulting me"). (b) keywords-only is unsafe: `CHAT_MODEL=openrouter/free`
    sometimes answers with junk ("User Safety: safe", `<|tool_call_start|>…`), and on its own that retrieved
    "This Hadith is Hasan Sahih" stubs. In (c) the question anchors the search, so junk only slightly dilutes it.
    K3 also: treat replies containing `<|` as empty (fallback).
  - Verify: run against the local DB (`LOCAL_DATABASE_URL`, read-only is fine).
  - Depends on: K1
  - Files: scratchpad script only (not committed)
  - Scope: S

- [ ] **Checkpoint K-A** — check_chat green; variant chosen; review with you before wiring.

- [ ] **K3 — wire into `/api/chat`**
  - Description: in `app/main.py`, replace `retrieval_query(req.messages)` with the K2 variant built on
    `await extract_keywords(req.messages)`. Log the search string at INFO.
  - Acceptance:
    - The order is still: errors before the stream (422/429/503), then `sources` → `delta`* → `done|error`.
    - With the `CHAT_*` provider down, chat still retrieves (fallback) and reports the upstream error as an event.
  - Verify: `scripts/check_chat.py` green; `scripts/smoke_chat.py` against `python -m uvicorn` on :8000;
    a manual follow-up question in /chat returns on-topic sources.
  - Depends on: K2
  - Files: `backend/app/main.py`, `backend/scripts/smoke_chat.py` (update the cost note: +1 LLM call per question)
  - Scope: S

- [ ] **K4 — (optional) show the search terms**
  - Description: add `query` to the `sources` event; the sources panel shows "Searched for: …".
  - Acceptance: the text renders, wraps at 375px, and doesn't appear for old events without `query`.
  - Verify: `npm run lint && npx tsc --noEmit && npm run build`; browser check with chrome-devtools.
  - Depends on: K3
  - Files: `backend/app/main.py`, `frontend/lib/types.ts`, `frontend/app/chat/page.tsx`
  - Scope: S

- [ ] **Checkpoint K-B** — all checks green; manual click-through (new question + follow-up); commit.
