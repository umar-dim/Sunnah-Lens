# TODO: Re-run search on filter change (see tasks/plan.md)

- [ ] T1 — backend: `lru_cache` query embeddings (`backend/app/embedding.py`)
- [ ] T2 — `/directory`: debounced re-run on filter change, latest-wins guard, empty-selection message
- [ ] T3 — `/search`: same as T2 (depends on T1)
- [ ] **Checkpoint** — lint/tsc/build + smoke; manual click-through; after-change review
