export interface HadithResult {
  id: number;
  collection_id: string;
  hadith_number: string;
  reference: string | null;
  in_book_reference: string | null;
  text_ar: string | null;
  text_en: string | null;
  matn_ar: string | null;
  matn_en: string | null;
  narrator: string | null;
  grade_en: string | null;
  grade_ar: string | null;
  similarity: number;
  collection_name: string | null;
  book_name: string | null;
  chapter_name: string | null;
}

export interface SearchResponse {
  query: string;
  results: HadithResult[];
}
