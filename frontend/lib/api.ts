import type {
  BookHadithsResponse,
  BookSelection,
  BooksResponse,
  ChatEvent,
  ChatMessage,
  DirectoryResponse,
  SearchResponse,
  TextSearchResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// The source data (sunnah.com) writes the Arabic letter ʿayn as a backtick:
// "Jami` at-Tirmidhi", "Mu`adh". Show it as a typographic ‘ everywhere.
const ayn = (_key: string, value: unknown) =>
  typeof value === "string" ? value.replaceAll("`", "\u2018") : value;

async function json<T>(res: Response): Promise<T> {
  return JSON.parse(await res.text(), ayn);
}

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

  return json(res);
}

// --- Chat (RAG) ---

// POST + streamed response, so EventSource can't be used; read the SSE body by hand.
export async function streamChat(
  messages: ChatMessage[],
  filter: BookSelection,
  onEvent: (e: ChatEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, ...filter }),
    signal,
  });

  if (!res.ok || !res.body) {
    if (res.status === 503) {
      throw new Error("Ask is unavailable right now. Please use Search instead.");
    }
    const detail = (await res.json().catch(() => null))?.detail;
    if (res.status === 429 && typeof detail === "string") throw new Error(detail);
    throw new Error("Something went wrong. Please try again.");
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += value.replace(/\r\n?/g, "\n");
    let end;
    while ((end = buffer.indexOf("\n\n")) >= 0) {
      const block = buffer.slice(0, end);
      buffer = buffer.slice(end + 2);
      let event = "";
      let data = "";
      for (const line of block.split("\n")) {
        if (line.startsWith("event: ")) event = line.slice(7);
        else if (line.startsWith("data: ")) data = line.slice(6);
      }
      if (!event || !data) continue;
      try {
        onEvent({ event, data: JSON.parse(data, ayn) } as ChatEvent);
      } catch {
        // Skip a malformed block; a missing done/error is reported as a cut-off answer.
      }
    }
  }
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

  return json(res);
}

// --- Directory ---

export async function getCollections(): Promise<DirectoryResponse> {
  const res = await fetch(`${API_URL}/api/collections`);
  if (!res.ok) throw new Error(`Failed to fetch collections: ${res.status}`);
  return json(res);
}

export async function getBooks(
  collectionId: string,
): Promise<BooksResponse> {
  const res = await fetch(
    `${API_URL}/api/collections/${collectionId}/books`,
  );
  if (!res.ok) throw new Error(`Failed to fetch books: ${res.status}`);
  return json(res);
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
  return json(res);
}
