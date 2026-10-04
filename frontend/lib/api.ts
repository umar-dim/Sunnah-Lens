import type {
  BookHadithsResponse,
  BookSelection,
  BooksResponse,
  DirectoryResponse,
  SearchResponse,
  TextSearchResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Free (Vector) Search ---

export async function searchHadith(
  query: string,
  topK: number,
  filter: BookSelection,
): Promise<SearchResponse> {
  const res = await fetch(`${API_URL}/api/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, top_k: topK, ...filter }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("API_QUOTA_EXHAUSTED");
    }
    throw new Error(`Search failed: ${res.status}`);
  }

  return res.json();
}

// --- Text (FTS) Search ---

export async function searchText(
  query: string,
  filter: BookSelection,
  page: number = 1,
  pageSize: number = 20,
): Promise<TextSearchResponse> {
  const res = await fetch(`${API_URL}/api/search/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, ...filter, page, page_size: pageSize }),
  });

  if (!res.ok) {
    throw new Error(`Text search failed: ${res.status}`);
  }

  return res.json();
}

// --- Directory ---

export async function getCollections(): Promise<DirectoryResponse> {
  const res = await fetch(`${API_URL}/api/collections`);
  if (!res.ok) throw new Error(`Failed to fetch collections: ${res.status}`);
  return res.json();
}

export async function getBooks(
  collectionId: string,
): Promise<BooksResponse> {
  const res = await fetch(
    `${API_URL}/api/collections/${collectionId}/books`,
  );
  if (!res.ok) throw new Error(`Failed to fetch books: ${res.status}`);
  return res.json();
}

export async function getBookHadiths(
  bookId: number,
  page: number = 1,
  pageSize: number = 20,
): Promise<BookHadithsResponse> {
  const res = await fetch(
    `${API_URL}/api/books/${bookId}/hadiths?page=${page}&page_size=${pageSize}`,
  );
  if (!res.ok) throw new Error(`Failed to fetch hadiths: ${res.status}`);
  return res.json();
}
