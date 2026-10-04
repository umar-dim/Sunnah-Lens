# Spec: Six-Books Refresh — text search in Directory, collection filters, repo link

Status: **APPROVED** (2026-10-04) — Muslim copy: "primary narrations only"; filter includes sub-books; R1–R4 in scope.

## Objective

SUNNAH LENS users should (a) browse *and* keyword-search from one place, (b) narrow either
search to the collections they care about, and (c) see accurate claims about what the app covers.

1. **Text search moves into `/directory`.** `/search` becomes semantic ("Free") search only.
   The directory gets a keyword search box with a short explainer of how text search works
   (English keyword match, stemmed — "pray" finds "prayer"; all words must appear; ranked by relevance).
2. **The app describes itself as covering the six books (Kutub al-Sittah).** The DB holds exactly six:
   Bukhari 7,252 · Muslim 3,087 · Abu Dawud 5,274 · Tirmidhi 3,951 · Nasa'i 5,754 · Ibn Majah 4,335
   (29,653 hadith, 29,652 embedded). Every "nine books" / "Bukhari and Muslim only" claim is replaced.
3. **GitHub link** → `https://github.com/umar-dim/Sunnah-Lens` (public), in the footer.
4. **Book filter on both searches.** Multi-select of the six collections, each expandable to pick
   individual sub-books (e.g. Bukhari › "Prayers (Salat)"). Default = everything.
5. **Code review before and after** (`code-review-and-quality`). Before-review findings are below.

## Before-change review findings (baseline: eslint, tsc, py-parse all clean)

| # | Sev | Where | Finding | In scope? |
|---|---|---|---|---|
| R1 | **Bug** | `backend/app/search.py` BOOK_HADITHS_SQL | `ORDER BY h.hadith_number` sorts text: Bukhari book 2 lists `10…58, 8, 9`. Verified in DB. | Yes — fix |
| R2 | Med | `backend/app/main.py` `list_book_hadiths` | `page`/`page_size` unbounded (`page_size=10^9`, `page=0` → negative OFFSET → 500). | Yes — `Query(ge,le)` |
| R3 | Med | `directory/page.tsx`, `search/page.tsx` | Hadith card markup copy-pasted 3× (HadithCard + 2 inline). Text search moving makes it 2 → fold into `HadithCard`. | Yes |
| R4 | Low | `directory/page.tsx` breadcrumbs | Clickable `<span onClick>` — not keyboard reachable. | Yes — `<button>` |
| R5 | Low | stale copy | `layout.tsx`, `search/layout.tsx` metadata, `DevNotice`, `ImportanceSection`, directory header all say nine books or Bukhari+Muslim only. | Yes (objective 2) |
| R6 | Low | `directory/page.tsx` | Rapid clicks can let a slower earlier response overwrite a later one (no request cancellation). | No — note only |

## Design

**API (only consumer is our frontend, so we replace rather than version):**
- `POST /api/search` — add `collection_ids: list[str] | None` and `book_ids: list[int] | None`.
- `POST /api/search/text` — replace `collection_id: str | None` with the same two fields.
- Semantics: both null = everything; otherwise a hadith matches if its collection is in
  `collection_ids` (whole collection) **or** its book is in `book_ids` (partial collection).
  The frontend sends a fully-selected collection as a collection id, a partial one as book ids.
- Validation: length caps only (`collection_ids` ≤ 6, `book_ids` ≤ 500). Unknown ids match nothing.

**SQL:**
- Shared predicate: `($2::text[] IS NULL AND $3::int[] IS NULL) OR h.collection_id = ANY($2) OR h.book_id = ANY($3)`
  — existing `idx_hadiths_collection` / `idx_hadiths_book` cover it.
- Vector: filter inside the `nearest` CTE by joining `hadiths`. Plain HNSW post-filters and can
  return < top_k for a small collection, so when a filter is set run in a transaction with
  `SET LOCAL hnsw.iterative_scan = relaxed_order` (pgvector **0.8.2** is installed, supports it).
  Outer `ORDER BY similarity` already restores exact order. No schema change.
  A book with fewer than `top_k` hadith simply returns fewer. Measure a single small book with
  `EXPLAIN ANALYZE`; if latency is bad, fall back to exact (no-index) scan for book-only filters.
- R1: `ORDER BY substring(h.hadith_number from '^\d+')::int NULLS LAST, h.hadith_number`.

**Frontend:**
- New `components/BookFilter.tsx`: a collapsible "Filter books" panel (native `<details>`).
  Six collection checkboxes (tri-state via `indeterminate`), each expandable to its sub-books,
  loaded lazily with the existing `getBooks()`. "Select all / none" actions. Search disabled when
  nothing selected. Exposes `{ collection_ids, book_ids }` (both null when everything selected).
- `/directory`: search box + filter + explainer above the grid. While a query is active, results
  (paginated, 20/page) replace the browse view; a "Clear search" button returns to browsing.
- `/search`: drop the mode tabs and text-search code; add `BookFilter`; update explainer;
  one line linking to keyword search in the Directory.
- `HadithCard`: accept `TextHadithResult`; show "% match" only when `similarity` is present.
- Footer: link text "GitHub" → `https://github.com/umar-dim/Sunnah-Lens`.

## Tech Stack
Frontend: Next.js 16.3.3, React 19.2.8, Tailwind 4, lucide-react. Backend: FastAPI, asyncpg,
Pydantic v2, Postgres 17 + pgvector 0.8.2, Gemini `gemini-embedding-001`.

## Commands
```
Frontend dev:    cd frontend && npm run dev
Frontend lint:   cd frontend && npx eslint .
Frontend types:  cd frontend && npx tsc --noEmit
Frontend build:  cd frontend && npm run build
Backend dev:     cd backend && uvicorn app.main:app --reload
Smoke check:     cd backend && python3 scripts/smoke_search.py   # new, API must be running
```

## Project Structure
```
backend/app/models.py, search.py, main.py   → API contract, SQL, endpoints
backend/scripts/smoke_search.py             → new stdlib-only runnable check
frontend/app/search/, app/directory/        → pages
frontend/components/                        → BookFilter (new), HadithCard, Footer, copy components
frontend/lib/api.ts, types.ts               → client + types
```

## Code Style
Match existing: SQL as module-level constants in `search.py`; Pydantic `Field` validation in
`models.py`; client components with `useState` and `@/` imports; Tailwind utility classes with
`stone-*` / `primary` tokens; shadcn-style `ui/` primitives.
```py
class TextSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    collection_ids: list[str] | None = Field(default=None, max_length=6)
    book_ids: list[int] | None = Field(default=None, max_length=500)
```

## Testing Strategy
No test framework exists and adding one is an "ask first". Instead:
- `backend/scripts/smoke_search.py` (stdlib `urllib` + `assert`) against a running API:
  text filter returns only chosen collections; a book-only filter returns only that book;
  collection+book mix is the union; vector search filtered to `muslim` returns `top_k` results,
  all from muslim; vector search filtered to one book returns only that book;
  book hadiths are numerically ordered; `page_size=0` → 422.
  (Vector check costs one Gemini call per run.)
- `EXPLAIN ANALYZE` the filtered vector query once to confirm the HNSW index is used.
- eslint + tsc + `npm run build` clean; manual browser check of both pages.

## Boundaries
- **Always:** ship backend + frontend together (API contract changes); cap filter list sizes server-side; run lint/tsc/build + smoke before calling it done.
- **Ask first:** DB schema changes or new indexes; adding any dependency (incl. pytest); committing/pushing; pointing `.env` at a different DB.
- **Never:** write to the cloud DB (read-only queries only); commit `.env`/secrets; touch `hadith_ai.dump`.

## Success Criteria
1. `/search` has no text-search mode; `/directory` has keyword search with an explainer and working pagination.
2. Selecting e.g. Tirmidhi + one sub-book of Nasa'i in either search returns results only from those; text total changes accordingly.
3. Filtered semantic search returns the full `top_k` even for the smallest collection (Muslim).
4. No remaining "nine" / "Bukhari and Muslim only" copy (`grep -ri "nine" frontend/app frontend/components` is empty); site names the six books and notes Sahih Muslim is primary narrations only.
5. Footer links to `https://github.com/umar-dim/Sunnah-Lens`.
6. R1–R4 fixed; smoke script passes; eslint, tsc, build clean.
7. After-change `code-review-and-quality` pass finds no Critical/Important issues left open.

## Open Questions
None — resolved 2026-10-04.
