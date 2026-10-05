import json
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.chat import TOP_K, RateLimiter, retrieval_query, stream_answer
from app.config import get_settings
from app.database import close_pool, get_pool
from app.embedding import embed_query, APIQuotaError
from app.models import (
    BookHadithsResponse,
    BookInfo,
    BooksResponse,
    ChatRequest,
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

logger = logging.getLogger(__name__)


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


# --- Chat (RAG) ---

chat_limiter = RateLimiter(limit=10, window=60)


def _client_ip(request: Request) -> str:
    # Render sits behind Cloudflare, which overwrites CF-Connecting-IP with the visitor's
    # address. X-Forwarded-For is not used: its first hop is client-controlled and its
    # last is a rotating Cloudflare edge. Locally there is no header, so use the peer.
    return request.headers.get("cf-connecting-ip") or (
        request.client.host if request.client else "unknown"
    )


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@app.post("/api/chat")
async def chat(req: ChatRequest, request: Request):
    settings = get_settings()
    if not (settings.CHAT_BASE_URL and settings.CHAT_API_KEY and settings.CHAT_MODEL):
        raise HTTPException(status_code=503, detail="Chat is not configured.")
    if not chat_limiter.allow(_client_ip(request)):
        raise HTTPException(status_code=429, detail="Too many questions. Please wait a minute.")

    # Retrieve before opening the stream so errors here are real HTTP statuses.
    pool = await get_pool()
    try:
        query_embedding = await embed_query(retrieval_query(req.messages))
    except APIQuotaError as e:
        raise HTTPException(status_code=429, detail=str(e))
    rows = await search_hadiths(pool, query_embedding, TOP_K, req.collection_ids, req.book_ids)
    sources = [
        HadithResult(**{**row, "similarity": round(row["similarity"], 4)}).model_dump()
        for row in rows
    ]

    async def events():
        yield _sse("sources", {"results": sources})
        if not rows:  # never let the model answer without sources
            yield _sse("delta", {"text": "No hadith matched your question in the selected books."})
            yield _sse("done", {})
            return
        sent = False
        try:
            async for text in stream_answer(req.messages, rows):
                sent = True
                yield _sse("delta", {"text": text})
        except httpx.HTTPStatusError as e:
            logger.warning("chat upstream returned %s", e.response.status_code)
            busy = e.response.status_code in (429, 503)  # quota / provider overloaded
            yield _sse("error", {
                "code": "quota" if busy else "upstream",
                "message": "The AI service is busy. Please try again later." if busy
                else "The AI service failed to answer. Please try again.",
            })
        except Exception:
            logger.exception("chat stream failed")
            yield _sse("error", {"code": "upstream",
                                 "message": "The AI service failed to answer. Please try again."})
        else:
            if sent:
                yield _sse("done", {})
            else:  # 200 but no content (content filter, empty stream)
                yield _sse("error", {"code": "upstream",
                                     "message": "The AI service returned no answer. Please try again."})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


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
