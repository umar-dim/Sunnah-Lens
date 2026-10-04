# Plan: Refresh local `hadith_ai` from Supabase cloud

## Goal
Wipe the local Postgres DB and replace it with an exact copy of the cloud (Supabase) `public` schema + data.

## Facts established (probed 2026-09-23)
| | cloud | local |
|---|---|---|
| version | PG 17.6 (Supabase) | PG 17.11 (Homebrew) |
| `vector` ext schema | `public` | `public` |
| tables | collections 7, books 428, chapters 13 030, hadiths 36 272 | 2 / 153 / 4 902 / 10 339 |
| hadiths w/ embedding | 22 452 | 3 720 |
| hadiths size | 482 MB | — |

- Only 4 user tables, all in `public`. Nothing in `auth`/`storage`/`realtime` is used by this app → dump `--schema=public` only.
- `pg_dump` **works over the pooler port 6543** (verified with a schema-only dump). No direct-connection change needed.
- A `--schema=public` dump does **not** emit `CREATE EXTENSION vector`, but `hadiths.embedding` needs it → the extension must exist in local `public` *before* restore.
- The dump *does* emit `CREATE SCHEMA public`, which collides with the freshly created one → filter that one TOC entry out with `pg_restore -l | grep -v | -L`, so the restore finishes with zero errors and a clean exit code.
- Connection strings live in `backend/.env` (cloud active, local commented out). Passwords stay out of these files — source them from `backend/.env`.

## Dependency graph
```
T1 backup local ──► T3 wipe+restore ──► T4 verify ──► T5 (optional) point app at local
T2 dump cloud  ──┘
```
T1 and T2 are independent; T3 needs both.

## Risks / mitigations
- **Irreversible wipe** → T1 takes a local `-Fc` backup first; nothing is dropped until that file exists.
- **~500 MB transfer over the pooler** → expect several minutes; dump to a file (not a pipe) so a failed transfer never leaves a half-wiped local DB.
- Existing `hadith_ai.dump` in the repo root is from 2025-08-27 — stale, not reused, not touched.

## Tasks

Scratch dir: `$S = /private/tmp/claude-501/-Users-abu-Projects-sunnah-lens/6da266a0-da6e-4bdc-b4b5-8c457fb4272a/scratchpad`
`$LOCAL` / `$CLOUD` = the two URLs from `backend/.env`.

### T1 — Safety backup of the current local DB
```
pg_dump "$LOCAL" -Fc -f $S/local_before_refresh.dump
```
**Accept:** file exists, non-zero size, `pg_restore -l` lists the 4 tables.
**Checkpoint A:** do not proceed until this file is verified.

### T2 — Dump cloud `public` schema + data
```
pg_dump "$CLOUD" --schema=public --no-owner --no-privileges -Fc -f $S/cloud.dump
```
**Accept:** exit 0; `pg_restore -l $S/cloud.dump` shows TABLE DATA for all 4 tables and the 17 indexes.
**Checkpoint B:** cloud dump verified before anything local is dropped.

### T3 — Wipe local and restore
```
psql "$LOCAL" -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; CREATE EXTENSION vector;'
pg_restore -l $S/cloud.dump | grep -v ' SCHEMA - public ' > $S/toc.list
pg_restore -d "$LOCAL" -L $S/toc.list --no-owner --no-privileges --exit-on-error $S/cloud.dump
```
**Accept:** `pg_restore` exits 0 with no error output.
**Verify:** `\dt` shows 4 tables; `\di` shows 17 indexes incl. `idx_hadith_embedding`.

### T4 — Verify the copy matches
```
psql "$LOCAL" -c "select (select count(*) from collections) c, (select count(*) from books) b,
                         (select count(*) from chapters) ch, (select count(*) from hadiths) h,
                         (select count(*) from hadiths where embedding is not null) emb;"
```
**Accept:** exactly `7 | 428 | 13030 | 36272 | 22452` (re-read cloud counts at run time in case they moved).
Also: sequences usable (`insert`-less check — `select last_value from hadiths_id_seq` ≥ max(id)), and one spot-check row compared field-by-field against cloud.
**Checkpoint C:** counts match → done; mismatch → restore `local_before_refresh.dump` and stop.

### T5 — (optional, only if asked) Point the app at local
Swap the commented/active `DATABASE_URL` lines in `backend/.env`, then smoke-test one search endpoint.
**Not done by default** — flipping the running app's DB is a separate decision.
