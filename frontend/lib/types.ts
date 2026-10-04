export interface SearchResponse {
  query: string;
  results: HadithResult[];
}

export interface TextHadithResult {
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
  collection_name: string | null;
  book_name: string | null;
  chapter_name: string | null;
}

export interface HadithResult extends TextHadithResult {
  similarity: number;
}

// Both null = all six collections. Otherwise whole collections OR individual books.
export interface BookSelection {
  collection_ids: string[] | null;
  book_ids: number[] | null;
}

export interface TextSearchResponse {
  query: string;
  results: TextHadithResult[];
  total: number;
  page: number;
  page_size: number;
}

export interface CollectionInfo {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  author_en: string | null;
  author_ar: string | null;
  hadith_count: number;
}

export interface BookInfo {
  id: number;
  book_number: number;
  name_en: string | null;
  name_ar: string | null;
  chapter_count: number;
  hadith_count: number;
}

export interface DirectoryResponse {
  collections: CollectionInfo[];
}

export interface BooksResponse {
  collection_id: string;
  books: BookInfo[];
}

export interface BookHadithsResponse {
  book_id: number;
  hadiths: TextHadithResult[];
  total: number;
  page: number;
  page_size: number;
}
