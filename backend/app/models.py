from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
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
