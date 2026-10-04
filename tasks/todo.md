# TODO: local DB refresh from cloud

- [x] T1 — `pg_dump` safety backup of local → `local_before_refresh.dump` verified
- [x] **Checkpoint A** — backup exists and lists 4 tables
- [x] T2 — `pg_dump` cloud `--schema=public` → `cloud.dump`
- [x] **Checkpoint B** — TOC shows 4 × TABLE DATA + 17 indexes
- [x] T3 — drop/recreate local `public`, `CREATE EXTENSION vector`, `pg_restore -L` (SCHEMA entry filtered out)
- [x] T4 — verify counts: 9 / 428 / 13030 / 36272, embeddings 22452; spot-check one row
- [x] **Checkpoint C** — counts match (else roll back from T1 backup)
- [ ] T5 — *optional, only on request:* point `backend/.env` at local + smoke test
