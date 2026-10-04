from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.database import close_pool, get_pool
from app.embedding import embed_query, APIQuotaError
from app.models import (
    BookHadithsResponse,
    BookInfo,
    BooksResponse,
    CollectionInfo,
    DirectoryResponse,
    HadithResult,
    SearchRequest,
    SearchResponse,
    TextHadithResult,
    TextSearchRequest,
    TextSearchResponse,
)
from app.search import (
    get_book_hadiths,
    get_books,
    get_collections,
    search_hadiths,
    text_search_hadiths,
)


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
        "https://sunnahlens.com",
        "https://www.sunnahlens.com",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Free (Vector) Search ---

@app.post("/api/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    pool = await get_pool()
    try:
        query_embedding = await embed_query(req.query)
    except APIQuotaError as e:
        raise HTTPException(
            status_code=429,
            detail=str(e),
        )
    rows = await search_hadiths(
        pool, query_embedding, req.top_k, req.collection_ids, req.book_ids
    )

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
            chapter_name=row.get("chapter_name"),
        )
        for row in rows
    ]

    return SearchResponse(query=req.query, results=results)


# --- Text (FTS) Search ---

@app.post("/api/search/text", response_model=TextSearchResponse)
async def text_search(req: TextSearchRequest):
    pool = await get_pool()
    rows, total = await text_search_hadiths(
        pool, req.query, req.collection_ids, req.book_ids, req.page, req.page_size
    )

    results = [
        TextHadithResult(
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
            collection_name=row["collection_name"],
            book_name=row["book_name"],
            chapter_name=row.get("chapter_name"),
        )
        for row in rows
    ]

    return TextSearchResponse(
        query=req.query,
        results=results,
        total=total,
        page=req.page,
        page_size=req.page_size,
    )


# --- Directory ---

@app.get("/api/collections", response_model=DirectoryResponse)
async def list_collections():
    pool = await get_pool()
    rows = await get_collections(pool)
    collections = [
        CollectionInfo(
            id=row["id"],
            name_en=row["name_en"],
            name_ar=row["name_ar"],
            author_en=row["author_en"],
            author_ar=row["author_ar"],
            hadith_count=row["hadith_count"],
        )
        for row in rows
    ]
    return DirectoryResponse(collections=collections)


@app.get("/api/collections/{collection_id}/books", response_model=BooksResponse)
async def list_books(collection_id: str):
    pool = await get_pool()
    rows = await get_books(pool, collection_id)
    books = [
        BookInfo(
            id=row["id"],
            book_number=row["book_number"],
            name_en=row["name_en"],
            name_ar=row["name_ar"],
            chapter_count=row["chapter_count"],
            hadith_count=row["hadith_count"],
        )
        for row in rows
    ]
    return BooksResponse(collection_id=collection_id, books=books)


@app.get("/api/books/{book_id}/hadiths", response_model=BookHadithsResponse)
async def list_book_hadiths(
    book_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    pool = await get_pool()
    rows, total = await get_book_hadiths(pool, book_id, page, page_size)
    hadiths = [
        TextHadithResult(
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
            collection_name=row["collection_name"],
            book_name=row["book_name"],
            chapter_name=row.get("chapter_name"),
        )
        for row in rows
    ]
    return BookHadithsResponse(
        book_id=book_id,
        hadiths=hadiths,
        total=total,
        page=page,
        page_size=page_size,
    )
