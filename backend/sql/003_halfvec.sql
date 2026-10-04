-- Store embeddings as halfvec (float16): halves the table and the HNSW index
-- (~468 MB -> ~235 MB) with negligible recall loss for cosine search.
-- app/search.py casts the query to halfvec, so deploy this with that change.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/003_halfvec.sql

\set ON_ERROR_STOP on
\timing on

BEGIN;

DROP INDEX idx_hadith_emb_gemini_001;

-- Rewrites the table, so the old float32 storage is reclaimed without VACUUM FULL.
ALTER TABLE hadith_embeddings ALTER COLUMN embedding TYPE halfvec(1536);

SET LOCAL maintenance_work_mem = '512MB';
CREATE INDEX idx_hadith_emb_gemini_001
    ON hadith_embeddings USING hnsw (embedding halfvec_cosine_ops)
    WHERE model = 'gemini-embedding-001';

COMMIT;

ANALYZE hadith_embeddings;
