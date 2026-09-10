"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import HadithList from "@/components/HadithList";
import { searchHadith, searchText } from "@/lib/api";
import type { HadithResult, TextHadithResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, BookOpen } from "lucide-react";

type SearchMode = "free" | "text";

export default function SearchPage() {
  const [mode, setMode] = useState<SearchMode>("free");

  // Free search state
  const [freeResults, setFreeResults] = useState<HadithResult[]>([]);
  const [freeLoading, setFreeLoading] = useState(false);
  const [freeError, setFreeError] = useState<string | null>(null);
  const [freeSearched, setFreeSearched] = useState(false);

  // Text search state
  const [textResults, setTextResults] = useState<TextHadithResult[]>([]);
  const [textLoading, setTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [textSearched, setTextSearched] = useState(false);
  const [textTotal, setTextTotal] = useState(0);
  const [textPage, setTextPage] = useState(1);
  const [textQuery, setTextQuery] = useState("");

  const handleFreeSearch = async (query: string) => {
    setFreeLoading(true);
    setFreeError(null);
    setFreeSearched(true);
    try {
      const data = await searchHadith(query, 7);
      setFreeResults(data.results);
    } catch (err) {
      setFreeError(err instanceof Error ? err.message : "An error occurred");
      setFreeResults([]);
    } finally {
      setFreeLoading(false);
    }
  };

  const handleTextSearch = async (query: string, page: number = 1) => {
    setTextLoading(true);
    setTextError(null);
    setTextSearched(true);
    setTextQuery(query);
    setTextPage(page);
    try {
      const data = await searchText(query, undefined, page, 20);
      setTextResults(data.results);
      setTextTotal(data.total);
    } catch (err) {
      setTextError(err instanceof Error ? err.message : "An error occurred");
      setTextResults([]);
      setTextTotal(0);
    } finally {
      setTextLoading(false);
    }
  };

  const textTotalPages = Math.ceil(textTotal / 20);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-12">
          {/* Mode Tabs */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Search Hadith
            </h1>
            <p className="mt-2 text-stone-500">
              Find authentic hadith using semantic or keyword search
            </p>
          </div>

          <div className="mb-6 flex justify-center gap-2">
            <Button
              variant={mode === "free" ? "default" : "outline"}
              onClick={() => setMode("free")}
              className="gap-2"
            >
              <Search className="h-4 w-4" />
              Free Search
            </Button>
            <Button
              variant={mode === "text" ? "default" : "outline"}
              onClick={() => setMode("text")}
              className="gap-2"
            >
              <BookOpen className="h-4 w-4" />
              Text Search
            </Button>
          </div>

          {/* Info Banner */}
          {mode === "free" ? (
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary-light/50 p-4 text-center">
              <p className="text-sm text-stone-600">
                <strong className="text-primary">Free Search</strong> uses AI-powered
                semantic embeddings to understand meaning and context.
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Currently covers a portion of{" "}
                <strong>Sahih al-Bukhari</strong> and{" "}
                <strong>Sahih Muslim</strong> collections.
              </p>
            </div>
          ) : (
            <div className="mb-6 rounded-lg border border-primary/20 bg-primary-light/50 p-4 text-center">
              <p className="text-sm text-stone-600">
                <strong className="text-primary">Text Search</strong> uses keyword
                matching across all imported hadiths.
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Browse the{" "}
                <a href="/directory" className="underline text-primary hover:text-primary/80">
                  Directory
                </a>{" "}
                to explore the full collection hierarchy.
              </p>
            </div>
          )}

          {/* Search Bar */}
          <SearchBar
            onSearch={mode === "free" ? handleFreeSearch : (q) => handleTextSearch(q, 1)}
            isLoading={mode === "free" ? freeLoading : textLoading}
            placeholder={
              mode === "free"
                ? "Describe what you're looking for..."
                : "Enter keywords to search..."
            }
          />

          {/* Results */}
          <div className="mt-8">
            {mode === "free" ? (
              <HadithList
                results={freeResults}
                isLoading={freeLoading}
                error={freeError}
                hasSearched={freeSearched}
              />
            ) : (
              <TextSearchResults
                results={textResults}
                isLoading={textLoading}
                error={textError}
                hasSearched={textSearched}
                total={textTotal}
                page={textPage}
                totalPages={textTotalPages}
                onPageChange={(p) => handleTextSearch(textQuery, p)}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// --- Text Search Results Component ---

interface TextSearchResultsProps {
  results: TextHadithResult[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function TextSearchResults({
  results,
  isLoading,
  error,
  hasSearched,
  total,
  page,
  totalPages,
  onPageChange,
}: TextSearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-6">
            <div className="flex gap-2 mb-3">
              <div className="h-5 w-20 animate-pulse rounded bg-stone-200" />
              <div className="h-5 w-28 animate-pulse rounded bg-stone-200" />
            </div>
            <div className="h-4 w-full mb-2 animate-pulse rounded bg-stone-200" />
            <div className="h-4 w-5/6 mb-2 animate-pulse rounded bg-stone-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-600">
          Something went wrong. Please try again.
        </p>
        <p className="mt-1 text-xs text-red-400">{error}</p>
      </div>
    );
  }

  if (hasSearched && results.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-10 text-center">
        <p className="text-stone-500">
          No hadith found for your query. Try different keywords.
        </p>
      </div>
    );
  }

  if (!hasSearched) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white/50 p-10 text-center">
        <p className="text-lg text-stone-400">
          Enter keywords to search across all hadith collections
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-stone-500">
        Found <strong>{total}</strong> result{total !== 1 ? "s" : ""}
      </p>

      <div className="flex flex-col gap-4">
        {results.map((hadith) => (
          <div
            key={hadith.id}
            className="rounded-xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {hadith.collection_name && (
                <Badge variant="default">{hadith.collection_name}</Badge>
              )}
              {hadith.book_name && (
                <Badge variant="secondary">{hadith.book_name}</Badge>
              )}
              {hadith.chapter_name && (
                <Badge variant="outline">{hadith.chapter_name}</Badge>
              )}
              <span className="ml-auto text-xs font-medium text-stone-400">
                #{hadith.hadith_number}
              </span>
            </div>

            {hadith.narrator && (
              <p className="mb-2 text-sm italic text-stone-500">
                Narrated by {hadith.narrator}
              </p>
            )}

            {(hadith.text_en || hadith.matn_en) && (
              <p className="text-base leading-relaxed text-stone-800">
                {hadith.text_en || hadith.matn_en}
              </p>
            )}

            {(hadith.text_ar || hadith.matn_ar) && (
              <p
                dir="rtl"
                className="mt-4 text-lg leading-loose text-stone-600 font-arabic"
              >
                {hadith.text_ar || hadith.matn_ar}
              </p>
            )}

            {hadith.grade_en && (
              <div className="mt-4 border-t border-stone-100 pt-3">
                <Badge variant="success">{hadith.grade_en}</Badge>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-stone-500">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
