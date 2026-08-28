from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import close_pool, get_pool
from app.embedding import embed_query
from app.models import HadithResult, SearchRequest, SearchResponse
from app.search import search_hadiths


@asynccontextmanager
async def lifespan(app: FastAPI):
    await get_pool()
    yield
    await close_pool()


app = FastAPI(title="Hadith AI Search API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://sunnah-lens.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    pool = await get_pool()
    query_embedding = await embed_query(req.query)
    rows = await search_hadiths(pool, query_embedding, req.top_k)

    results = [
        HadithResult(
            id=row["id"],
            collection_id=row["collection_id"],
            hadith_number=row["hadith_number"],
            reference=row["reference"],
            in_book_reference=row["in_book_reference"],
            text_ar=row["text_ar"],
            text_en=row["text_en"],
            matn_ar=row["matn_ar"],
            matn_en=row["matn_en"],
            narrator=row["narrator"],
            grade_en=row["grade_en"],
            grade_ar=row["grade_ar"],
            similarity=round(row["similarity"], 4),
            collection_name=row["collection_name"],
            book_name=row["book_name"],
            chapter_name=row["chapter_name"],
        )
        for row in rows
    ]

    return SearchResponse(query=req.query, results=results)
