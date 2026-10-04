# Plan: Re-run search when the book filter changes

## Overview
On `/search` (semantic) and `/directory` (keyword), changing the book filter after a search
leaves the old results on screen. After this change, the active search re-runs with the new filter.

## Architecture Decisions
- **Handler-driven, debounced (400 ms).** `BookFilter.onChange` → page sets the filter and, if a
  query is active, schedules a re-run (timer in a ref). Ticking several boxes fires one request.
  Done in the handler rather than a `useEffect` to keep the existing "filter is passed in
  explicitly" flow and avoid effect/state lint issues.
- **Latest request wins.** Each search takes an id from a ref counter; a response whose id
  isn't the latest is dropped. Without this, debounced re-runs plus manual searches can land
  out of order. (This only covers search, not directory browsing; that's follow-up #2.)
- **Re-runs reset to page 1** (keyword search); the old page number may not exist under the new filter.
- **Nothing selected** → cancel any pending re-run, clear the results, and show "Select at least one book".
  The query stays, so re-selecting books runs it again.
- **Cache query embeddings in the backend** (`functools.lru_cache(maxsize=512)` on a sync helper).
  A semantic re-run with the same text then costs no Gemini call, so toggling filters doesn't
  burn quota. Exceptions (quota errors) aren't cached by `lru_cache`.
- No shared hook: two call sites with ~15 lines each. Extract one if a third appears.

## Task List

### Task 1: Cache query embeddings (XS)
**Acceptance:**
- [ ] Repeating a semantic search for the same text makes no second Gemini call.
- [ ] Quota errors are not cached; the next call retries.

**Verification:** smoke script passes; the same `/api/search` call twice: second is noticeably
faster (no ~300 ms+ embedding round-trip).
**Dependencies:** None. **Files:** `backend/app/embedding.py`

### Task 2: `/directory` keyword search follows the filter (S)
**Acceptance:**
- [ ] With an active query, changing the filter re-runs the search on page 1 after ~400 ms; quick changes send one request.
- [ ] A stale response never replaces a newer one.
- [ ] With nothing selected, results clear and "Select at least one book" shows; re-selecting runs the search again.

**Verification:** eslint + tsc + build; manual: search "prayer", untick collections → total updates.
**Dependencies:** None. **Files:** `frontend/app/directory/page.tsx`

### Task 3: `/search` semantic search follows the filter (S)
**Acceptance:** same three criteria as Task 2 (no paging).
**Verification:** eslint + tsc + build; manual: search, narrow to one collection → all badges match it.
**Dependencies:** Task 1 (so re-runs don't spend quota). **Files:** `frontend/app/search/page.tsx`

### Checkpoint: Complete
- [ ] eslint, tsc, `npm run build` clean; `scripts/smoke_search.py` passes
- [ ] Manual click-through of both pages (no browser automation here → user confirms)
- [ ] After-change review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| Each filter click burns a Gemini call | Med | Task 1 cache + debounce |
| Out-of-order responses show the wrong filter's results | Med | latest-request-wins guard |
| Embedding cache memory | Low | 512 × 1536 floats ≈ 6 MB worst case |

## Open Questions
- None. Defaults: 400 ms debounce, reset to page 1.
