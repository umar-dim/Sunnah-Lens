from typing import Literal

from pydantic import BaseModel, Field, field_validator


class FilterFields(BaseModel):
    # Both None = every collection. Otherwise a hadith matches if its collection
    # is in collection_ids (whole collection) or its book is in book_ids.
    collection_ids: list[str] | None = Field(default=None, max_length=6)
    book_ids: list[int] | None = Field(default=None, max_length=500)


# --- Free (Vector) Search ---

class SearchRequest(FilterFields):
    query: str = Field(..., min_length=1, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=20)


class HadithResult(BaseModel):
    id: int
    collection_id: str
    hadith_number: str
    reference: str | None = None
    in_book_reference: str | None = None
    text_ar: str | None = None
    text_en: str | None = None
    matn_ar: str | None = None
    matn_en: str | None = None
    narrator: str | None = None
    grade_en: str | None = None
    grade_ar: str | None = None
    similarity: float
    collection_name: str | None = None
    book_name: str | None = None
    chapter_name: str | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[HadithResult]


# --- Text (FTS) Search ---

class TextSearchRequest(FilterFields):
    query: str = Field(..., min_length=1, max_length=2000)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


class TextHadithResult(BaseModel):
    id: int
    collection_id: str
    hadith_number: str
    reference: str | None = None
    in_book_reference: str | None = None
    text_ar: str | None = None
    text_en: str | None = None
    matn_ar: str | None = None
    matn_en: str | None = None
    narrator: str | None = None
    grade_en: str | None = None
    grade_ar: str | None = None
    collection_name: str | None = None
    book_name: str | None = None
    chapter_name: str | None = None


class TextSearchResponse(BaseModel):
    query: str
    results: list[TextHadithResult]
    total: int
    page: int
    page_size: int


# --- Directory ---

class CollectionInfo(BaseModel):
    id: str
    name_en: str | None = None
    name_ar: str | None = None
    author_en: str | None = None
    author_ar: str | None = None
    hadith_count: int


class BookInfo(BaseModel):
    id: int
    book_number: int
    name_en: str | None = None
    name_ar: str | None = None
    chapter_count: int
    hadith_count: int


class DirectoryResponse(BaseModel):
    collections: list[CollectionInfo]


class BooksResponse(BaseModel):
    collection_id: str
    books: list[BookInfo]


class BookHadithsResponse(BaseModel):
    book_id: int
    hadiths: list[TextHadithResult]
    total: int
    page: int
    page_size: int


# --- Chat (RAG) ---

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1, max_length=2000)


class ChatRequest(FilterFields):
    messages: list[ChatMessage] = Field(..., min_length=1, max_length=10)

    @field_validator("messages")
    @classmethod
    def last_is_user(cls, v: list[ChatMessage]) -> list[ChatMessage]:
        if v[-1].role != "user":
            raise ValueError("last message must be from the user")
        return v
