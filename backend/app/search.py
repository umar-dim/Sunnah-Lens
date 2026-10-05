from __future__ import annotations

import asyncpg

from app.embedding import MODEL as EMBED_MODEL

# Book filter shared by every search: $a = collection_ids, $b = book_ids.
# Both NULL = everything; otherwise whole collections OR individual books.
def _filter_sql(a: int, b: int) -> str:
    return f"(h.collection_id = ANY(${a}::text[]) OR h.book_id = ANY(${b}::int[]))"


# --- Vector Search ---

def _search_sql(model: str, filtered: bool = False) -> str:
    # The model name must be a LITERAL, not a bind param: Postgres can only use
    # the partial HNSW index if it can prove the predicate matches at plan time.
    # It is a code-level constant, never user input.
    join = "JOIN hadiths h ON h.id = e.hadith_id" if filtered else ""
    where = f"AND {_filter_sql(3, 4)}" if filtered else ""
    return f"""
WITH nearest AS (
    SELECT e.hadith_id,
           1 - (e.embedding <=> $1::text::halfvec) AS similarity
    FROM hadith_embeddings e
    {join}
    WHERE e.model = '{model}' {where}
    ORDER BY e.embedding <=> $1::text::halfvec
    LIMIT $2
)
SELECT
    h.id,
    h.collection_id,
    h.hadith_number,
    h.reference,
    h.in_book_reference,
    h.text_ar,
    h.text_en,
    h.matn_ar,
    h.matn_en,
    h.narrator,
    h.grade_en,
    h.grade_ar,
    n.similarity,
    c.name_en AS collection_name,
    b.name_en AS book_name,
    ch.name_en AS chapter_name
FROM nearest n
JOIN hadiths h ON h.id = n.hadith_id
LEFT JOIN collections c ON c.id = h.collection_id
LEFT JOIN books b ON b.id = h.book_id
LEFT JOIN chapters ch ON ch.id = h.chapter_id
ORDER BY n.similarity DESC
"""


SEARCH_SQL = _search_sql(EMBED_MODEL)
FILTERED_SEARCH_SQL = _search_sql(EMBED_MODEL, filtered=True)


# --- Text Search (FTS) ---

TEXT_FILTER = f"(($2::text[] IS NULL AND $3::int[] IS NULL) OR {_filter_sql(2, 3)})"

TEXT_SEARCH_SQL = f"""
SELECT
    h.id,
    h.collection_id,
    h.hadith_number,
    h.reference,
    h.in_book_reference,
    h.text_ar,
    h.text_en,
    h.matn_ar,
    h.matn_en,
    h.narrator,
    h.grade_en,
    h.grade_ar,
    c.name_en AS collection_name,
    b.name_en AS book_name,
    ch.name_en AS chapter_name
FROM hadiths h
LEFT JOIN collections c ON c.id = h.collection_id
LEFT JOIN books b ON b.id = h.book_id
LEFT JOIN chapters ch ON ch.id = h.chapter_id
WHERE to_tsvector('english', coalesce(h.matn_en, '') || ' ' || coalesce(h.text_en, ''))
      @@ plainto_tsquery('english', $1)
    AND {TEXT_FILTER}
ORDER BY ts_rank(
    to_tsvector('english', coalesce(h.matn_en, '') || ' ' || coalesce(h.text_en, '')),
    plainto_tsquery('english', $1)
) DESC
"""

TEXT_SEARCH_COUNT_SQL = f"""
SELECT count(*) FROM hadiths h
WHERE to_tsvector('english', coalesce(h.matn_en, '') || ' ' || coalesce(h.text_en, ''))
      @@ plainto_tsquery('english', $1)
    AND {TEXT_FILTER}
"""

TEXT_SEARCH_PAGINATED_SQL = TEXT_SEARCH_SQL + "\nLIMIT $4 OFFSET $5"

# --- Directory Queries ---

COLLECTIONS_SQL = """
SELECT
    c.id,
    c.name_en,
    c.name_ar,
    c.author_en,
    c.author_ar,
    count(h.id)::int AS hadith_count
FROM collections c
LEFT JOIN hadiths h ON h.collection_id = c.id
GROUP BY c.id, c.name_en, c.name_ar, c.author_en, c.author_ar
-- Traditional order of the Kutub al-Sittah; unknown ids sort last.
ORDER BY array_position(ARRAY['bukhari','muslim','abudawud','tirmidhi','nasai','ibnmajah'], c.id), c.name_en
"""

BOOKS_SQL = """
SELECT
    b.id,
    b.book_number,
    b.name_en,
    b.name_ar,
    (SELECT count(*) FROM chapters ch WHERE ch.book_id = b.id)::int AS chapter_count,
    (SELECT count(*) FROM hadiths h WHERE h.book_id = b.id)::int AS hadith_count
FROM books b
WHERE b.collection_id = $1
ORDER BY b.book_number
"""

BOOK_HADITHS_SQL = """
SELECT
    h.id,
    h.collection_id,
    h.hadith_number,
    h.reference,
    h.in_book_reference,
    h.text_ar,
    h.text_en,
    h.matn_ar,
    h.matn_en,
    h.narrator,
    h.grade_en,
    h.grade_ar,
    c.name_en AS collection_name,
    b.name_en AS book_name
FROM hadiths h
LEFT JOIN collections c ON c.id = h.collection_id
LEFT JOIN books b ON b.id = h.book_id
WHERE h.book_id = $1
-- hadith_number is text ("8", "10", "12a"): sort by its numeric prefix first.
ORDER BY substring(h.hadith_number from '^[0-9]+')::int NULLS LAST, h.hadith_number
LIMIT $2 OFFSET $3
"""

BOOK_HADITHS_COUNT_SQL = """
SELECT count(*)::int FROM hadiths WHERE book_id = $1
"""


def _embedding_to_pgvector(embedding: list[float]) -> str:
    return "[" + ", ".join(str(v) for v in embedding) + "]"


async def search_hadiths(
    pool: asyncpg.Pool,
    query_embedding: list[float],
    top_k: int,
    collection_ids: list[str] | None = None,
    book_ids: list[int] | None = None,
    model: str = EMBED_MODEL,
) -> list[dict]:
    embedding_str = _embedding_to_pgvector(query_embedding)
    async with pool.acquire() as conn:
        if collection_ids is None and book_ids is None:
            sql = SEARCH_SQL if model == EMBED_MODEL else _search_sql(model)
            rows = await conn.fetch(sql, embedding_str, top_k)
        else:
            sql = FILTERED_SEARCH_SQL if model == EMBED_MODEL else _search_sql(model, filtered=True)
            async with conn.transaction():
                # HNSW filters after the index scan, so a narrow filter would come
                # back short of top_k; iterative scan keeps walking the graph.
                await conn.execute("SET LOCAL hnsw.iterative_scan = relaxed_order")
                rows = await conn.fetch(sql, embedding_str, top_k, collection_ids, book_ids)
        return [dict(row) for row in rows]


async def text_search_hadiths(
    pool: asyncpg.Pool,
    query: str,
    collection_ids: list[str] | None,
    book_ids: list[int] | None,
    page: int,
    page_size: int,
) -> tuple[list[dict], int]:
    async with pool.acquire() as conn:
        total = await conn.fetchval(TEXT_SEARCH_COUNT_SQL, query, collection_ids, book_ids)
        offset = (page - 1) * page_size
        rows = await conn.fetch(
            TEXT_SEARCH_PAGINATED_SQL, query, collection_ids, book_ids, page_size, offset
        )
        return [dict(row) for row in rows], total


async def get_collections(pool: asyncpg.Pool) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(COLLECTIONS_SQL)
        return [dict(row) for row in rows]


async def get_books(pool: asyncpg.Pool, collection_id: str) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(BOOKS_SQL, collection_id)
        return [dict(row) for row in rows]


async def get_book_hadiths(
    pool: asyncpg.Pool,
    book_id: int,
    page: int,
    page_size: int,
) -> tuple[list[dict], int]:
    async with pool.acquire() as conn:
        total = await conn.fetchval(BOOK_HADITHS_COUNT_SQL, book_id)
        offset = (page - 1) * page_size
        rows = await conn.fetch(BOOK_HADITHS_SQL, book_id, page_size, offset)
        return [dict(row) for row in rows], total
