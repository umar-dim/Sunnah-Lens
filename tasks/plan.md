# Plan: Ask — hadith-grounded AI chat (see SPEC-chat.md)

## Overview
Add `POST /api/chat` and a `/chat` page.
- Retrieval reuses `embed_query` + `search_hadiths`.
- Generation is a streamed call to any OpenAI-compatible endpoint, using its own key.
- The browser holds the thread. Nothing is persisted.

## Architecture Decisions
- **Retrieve before the stream opens.**
  - The endpoint validates input, rate-limits, embeds, and runs the vector search first, then
    returns a `StreamingResponse`.
  - So 422/429/503 are real HTTP statuses, and the stream only carries `sources` → `delta`* → `done|error`.
  - Upstream LLM failures happen after the 200, so they go out as an `error` event.
- **`app/chat.py` holds pure, testable pieces:**
  - `retrieval_query(messages)`
  - `build_prompt(messages, sources)`
  - `parse_sse_delta(line)`
  - `RateLimiter`
  - `stream_answer(...)`: the only I/O.

  `main.py` stays thin.
- **httpx, no SDK.**
  - Parse only `choices[0].delta.content`.
  - Skip lines without `data:`, chunks with empty `choices` (usage chunks), and keep-alives.
  - Stop on `[DONE]`.
- **SSE response headers:** `Cache-Control: no-cache`, `X-Accel-Buffering: no`, so Render/proxies don't buffer.
- **Frontend stream reader:**
  - `fetch` + `res.body.getReader()` + `TextDecoder`.
  - Split on blank lines and dispatch on `event:`.
  - Supports an `AbortController` so a new question cancels the old stream. The backend's httpx stream
    closes when the generator is cancelled.
- **Citations:** the frontend regex-splits the answer on `\[(\d+)\]` and renders a marker as an anchor to
  the card `#source-n` only when `1 ≤ n ≤ sources.length`. Any other marker stays plain text.

## Dependency Graph
```
config + models ─► chat.py (pure) ─► /api/chat endpoint ─► types + streamChat ─► /chat page + nav
                       │                    │                                          │
                 check_chat.py        smoke_chat.py                          browser verify (:3000)
```
The backend must be finished before the frontend. The frontend API client and page could be split,
but they're small, so they're kept sequential.

## Risks
| Risk | Mitigation |
|---|---|
| Provider quirks (`data:` without a space, usage chunks, error JSON mid-stream) | `parse_sse_delta` is tolerant and covered by offline asserts. Any upstream exception → `error` event |
| Proxy buffering kills streaming in prod | Set the headers above, and verify against the deployed API after the merge (manual) |
| Weak retrieval on follow-ups | Join with the previous user message (spec). The upgrade path is a query-rewrite step |
| Model answers from general knowledge | Strict system prompt. Smoke-check an off-corpus question |
| `X-Forwarded-For` is spoofable | Accepted for now. The limiter is a cost guard, not security |

## Verification Checkpoints
1. After T2: curl the stream locally. Events arrive in order, with tokens arriving incrementally rather than in one burst.
2. After T4: full browser pass on :3000, including mobile width and error states.

---

# Revision (2026-10-05): chat answer layout

## Overview
This changes how each answer turn reads. It is frontend-only, with no API or prompt change.
1. Sources sit **above** the answer, **collapsed** ("8 hadith used as sources ▸").
2. While a turn loads, a **stopwatch** runs and an Islamic-themed status line **rotates every 3s**.
3. Citations read as **collection + number** ("Sahih al-Bukhari 6116") instead of `[1]`.
4. **Clicking a citation** opens the sources, **smooth-scrolls** to that hadith, and **highlights** it for about 2s.

## Architecture Decisions
- **The model keeps emitting `[n]`, and the frontend maps it.**
  - `[n]` → `sources[n-1]` → `"{collection_name} {hadith_number}"`.
  - Asking the model to write names itself would make citations fuzzy (typos, wrong numbers) and break
    the guarantee that every marker maps to a shown card.
  - `[n]` outside `1..sources.length` stays plain text, as now.
- **Citations become `<button>`s, not `#hash` links.**
  - The click has to open the panel first, then scroll. A button also keeps the URL clean.
  - `aria-controls` points at the sources panel.
- **Collapsible panel:** native `<details>`/`<summary>`, with `open` controlled per turn (state: set of open turn
  indexes) so a citation click can open it. You get keyboard and screen-reader behaviour without extra code.
- **Scroll + highlight:**
  - On click: set the turn open, then on the next frame call `el.scrollIntoView({behavior, block: "center"})`.
  - Set `highlighted = "t{turn}-s{n}"` and clear it after 2s. The cleared timer lives in a ref so rapid clicks
    restart it.
  - `behavior` is `"auto"` when `prefers-reduced-motion` is set.
  - The highlight is a Masjid Green ring plus Mist background with a colour transition, per DESIGN.md's
    "motion is colour and shadow only" rule.
- **Stopwatch:**
  - Each turn records `startedAt` and `finishedAt` (`performance.now()`).
  - One `setInterval(100ms)` runs only while a turn is streaming, ticking a `now` state. It is cleared on
    done, error and unmount.
  - Display: `0:07` while running, then a quiet "Answered in 12.4s" or "Stopped after 9.1s" when finished.
  - It stops at **done or error**, not at the first token.
- **Status messages:**
  - Shown while streaming **until the first answer text appears**. After that the text itself is the progress,
    and only the stopwatch keeps running.
  - The message index is `floor(elapsed / 3s) % messages.length`. That needs no second timer: it comes from
    the same tick.
  - The messages describe only what is really happening (the PRODUCT.md "find, don't rule" principle). There
    are no hadith quotes, because quoting a hadith without its reference would break attribution, and no
    claims we don't do, like "checking chains of narration".
- **Placement:**
  - Each turn is ordered: question → sources (collapsed) → answer card.
  - The stopwatch and status line sit inside the answer card header.
  - The existing `aria-busy` live region stays on the answer text only, so the ticking timer isn't announced.

## Proposed status messages (rotate every 3s)
1. Searching the six books of hadith…
2. Gathering narrations from Bukhari, Muslim and the Sunan…
3. Reading the words of the Prophet ﷺ…
4. Matching narrations to your question…
5. Preparing an answer with its references…

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Long chip names wrap awkwardly mid-sentence on mobile | Low | Chip is `whitespace-nowrap`; check at 375px |
| Scrolling before `<details>` has opened → wrong position | Med | Scroll in `requestAnimationFrame` after the state update. Verify in browser |
| A 100ms re-render of the whole thread while streaming | Low | Re-rendering a few turns is trivial. `ponytail:` extract a `<Stopwatch>` if it ever shows in profiling |
| Duplicate `id`s when the same hadith appears in two turns | Low | IDs stay turn-scoped (`t{turn}-s{n}`) |

## Open Questions
- Are the status messages above OK, or do you want different wording or more of them?
- Should the stopwatch stop at the end of the answer (planned) or at the first word?
