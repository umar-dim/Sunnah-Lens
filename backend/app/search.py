from __future__ import annotations

import asyncpg

# --- Vector Search ---

SEARCH_SQL = """
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
    1 - (h.embedding <=> $1::text::vector) AS similarity,
    c.name_en AS collection_name,
    b.name_en AS book_name,
    ch.name_en AS chapter_name
FROM hadiths h
LEFT JOIN collections c ON c.id = h.collection_id
LEFT JOIN books b ON b.id = h.book_id
LEFT JOIN chapters ch ON ch.id = h.chapter_id
WHERE h.embedding IS NOT NULL
ORDER BY h.embedding <=> $1::text::vector
LIMIT $2
"""

# --- Text Search (FTS) ---

TEXT_SEARCH_SQL = """
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
    AND ($2::text IS NULL OR h.collection_id = $2)
ORDER BY ts_rank(
    to_tsvector('english', coalesce(h.matn_en, '') || ' ' || coalesce(h.text_en, '')),
    plainto_tsquery('english', $1)
) DESC
"""

TEXT_SEARCH_COUNT_SQL = """
SELECT count(*) FROM hadiths h
WHERE to_tsvector('english', coalesce(h.matn_en, '') || ' ' || coalesce(h.text_en, ''))
      @@ plainto_tsquery('english', $1)
    AND ($2::text IS NULL OR h.collection_id = $2)
"""

TEXT_SEARCH_PAGINATED_SQL = TEXT_SEARCH_SQL + "\nLIMIT $3 OFFSET $4"

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
ORDER BY c.name_en
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
ORDER BY h.hadith_number
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
) -> list[dict]:
    embedding_str = _embedding_to_pgvector(query_embedding)
    async with pool.acquire() as conn:
        rows = await conn.fetch(SEARCH_SQL, embedding_str, top_k)
        return [dict(row) for row in rows]


async def text_search_hadiths(
    pool: asyncpg.Pool,
    query: str,
    collection_id: str | None,
    page: int,
    page_size: int,
) -> tuple[list[dict], int]:
    async with pool.acquire() as conn:
        total = await conn.fetchval(TEXT_SEARCH_COUNT_SQL, query, collection_id)
        offset = (page - 1) * page_size
        rows = await conn.fetch(TEXT_SEARCH_PAGINATED_SQL, query, collection_id, page_size, offset)
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
