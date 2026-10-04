-- Move hadiths.embedding into its own table, keyed (hadith_id, model) so a
-- hadith can carry more than one embedding.
--
-- Run against a DIRECT/session connection, NOT the pgbouncer pooler on :6543 --
-- transaction-mode pooling and a multi-minute DDL transaction do not mix.
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f sql/002_split_embeddings.sql

\set ON_ERROR_STOP on
\timing on

BEGIN;

CREATE TABLE hadith_embeddings (
    hadith_id  integer      NOT NULL REFERENCES hadiths(id) ON DELETE CASCADE,
    model      varchar(100) NOT NULL,
    -- ponytail: fixed at 1536 so HNSW can index it. A model with different
    -- output dims needs its own column/table; pgvector cannot index a bare
    -- `vector`. Gemini's output_dimensionality can be pinned to 1536.
    embedding  vector(1536) NOT NULL,
    created_at timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (hadith_id, model)
);

INSERT INTO hadith_embeddings (hadith_id, model, embedding, created_at)
SELECT id,
       coalesce(embedding_model, 'gemini-embedding-001'),
       embedding,
       coalesce(embedding_created_at, now())
FROM hadiths
WHERE embedding IS NOT NULL;

-- Self-check: abort (and roll the whole thing back) if a single row was lost.
DO $$
DECLARE src bigint; dst bigint;
BEGIN
    SELECT count(*) INTO src FROM hadiths WHERE embedding IS NOT NULL;
    SELECT count(*) INTO dst FROM hadith_embeddings;
    IF src <> dst THEN
        RAISE EXCEPTION 'copied % of % embeddings', dst, src;
    END IF;
    RAISE NOTICE 'copied % embeddings', dst;
END $$;

-- Build the index after the load, not before.
-- One PARTIAL index per model: a shared HNSW index over mixed models returns
-- meaningless neighbours, and filtering a full index post-filters and wrecks
-- recall. Adding a model later = one more index exactly like this.
SET LOCAL maintenance_work_mem = '512MB';  -- drop to '128MB' if the instance refuses
CREATE INDEX idx_hadith_emb_gemini_001
    ON hadith_embeddings USING hnsw (embedding vector_cosine_ops)
    WHERE model = 'gemini-embedding-001';

ALTER TABLE hadiths
    DROP COLUMN embedding,            -- takes idx_hadith_embedding with it
    DROP COLUMN embedding_model,
    DROP COLUMN embedding_created_at;

COMMIT;

-- Must be outside the transaction. ACCESS EXCLUSIVE lock on hadiths for the
-- duration; needs free disk roughly equal to the current 445 MB table.
VACUUM FULL hadiths;

ANALYZE hadiths;
ANALYZE hadith_embeddings;
