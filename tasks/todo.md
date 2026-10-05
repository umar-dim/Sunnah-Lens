# TODO: Re-run search on filter change (see tasks/plan.md)

- [x] T1 — backend: `lru_cache` query embeddings (`backend/app/embedding.py`)
- [x] T2 — `/directory`: debounced re-run on filter change, latest-wins guard, empty-selection message
- [x] T3 — `/search`: same as T2 (depends on T1)
- [x] **Checkpoint** — lint/tsc/build + smoke; after-change review (manual click-through: user)
