from __future__ import annotations

import asyncpg

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
