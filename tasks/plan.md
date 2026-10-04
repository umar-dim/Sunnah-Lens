# Plan: Six-Books Refresh (see SPEC.md)

## Dependency graph
```
T1 backend filters + R1/R2 ──► T2 smoke script ──► (checkpoint A: API verified)
                                                     │
T3 api.ts/types + HadithCard (R3) ───────────────────┤
T4 BookFilter component ─────────────────────────────┤
                                                     ▼
                         T5 /search page   T6 /directory page (+R4)
                                                     ▼
                         T7 copy + footer link ──► T8 verify + after-review
```
T3/T4 are independent of each other; T5/T6 need T1, T3, T4.

## Risks
- Filtered HNSW returning < top_k → `hnsw.iterative_scan = relaxed_order` (pgvector 0.8.2). Verified by smoke + EXPLAIN.
- Very selective (single small book) vector filter may scan many tuples → measure; fallback = exact scan.
- Smoke runs against the DB in `backend/.env` (cloud) — read-only queries only.
