# TODO: Six-Books Refresh

- [x] T1 — backend: `collection_ids`/`book_ids` on both search requests; shared SQL predicate; iterative scan for filtered vector search; R1 numeric hadith order; R2 `Query(ge,le)` on book hadiths
  - Files: backend/app/models.py, search.py, main.py
- [x] T2 — `backend/scripts/smoke_search.py` (stdlib) — passes against local uvicorn
- [x] **Checkpoint A** — smoke passes; EXPLAIN shows HNSW index on filtered query
- [x] T3 — `lib/types.ts`, `lib/api.ts` (filter params), `HadithCard` accepts text results (R3)
- [x] T4 — `components/BookFilter.tsx` (collections + lazy sub-books, tri-state)
- [x] T5 — `/search`: semantic only + BookFilter + Directory link
- [x] T6 — `/directory`: text search + explainer + BookFilter + pagination + clear; breadcrumbs → buttons (R4)
- [x] T7 — six-books copy (layout, search layout, Hero?, DevNotice, ImportanceSection, directory), Muslim "primary narrations only", footer GitHub link
- [x] T8 — eslint, tsc, build, smoke, browser check; after-change code-review-and-quality
