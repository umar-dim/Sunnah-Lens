"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CollectionCard from "@/components/CollectionCard";
import HadithCard from "@/components/HadithCard";
import SearchBar from "@/components/SearchBar";
import BookFilter from "@/components/BookFilter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCollections, getBooks, getBookHadiths, searchText } from "@/lib/api";
import type {
  CollectionInfo,
  BookInfo,
  BookSelection,
  TextHadithResult,
} from "@/lib/types";
import {
  ChevronRight,
  BookOpen,
  ArrowLeft,
  X,
} from "lucide-react";

type ViewLevel = "collections" | "books" | "hadiths";

export default function DirectoryPage() {
  const [level, setLevel] = useState<ViewLevel>("collections");
  const [collections, setCollections] = useState<CollectionInfo[]>([]);
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [hadiths, setHadiths] = useState<TextHadithResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCollection, setSelectedCollection] = useState<CollectionInfo | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookInfo | null>(null);

  const [hadithPage, setHadithPage] = useState(1);
  const [hadithTotal, setHadithTotal] = useState(0);

  const hadithPageSize = 20;

  // Keyword search
  const [filter, setFilter] = useState<BookSelection | null>({
    collection_ids: null,
    book_ids: null,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<TextHadithResult[]>([]);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchKey, setSearchKey] = useState(0); // remounts SearchBar to clear its input
  const searchSeq = useRef(0); // only the latest search may write results
  const rerunTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = async (
    query: string,
    page: number = 1,
    selection: BookSelection | null = filter,
  ) => {
    clearTimeout(rerunTimer.current);
    if (!selection) return;
    const seq = ++searchSeq.current;
    setSearchQuery(query);
    setSearchPage(page);
    setSearchLoading(true);
    setSearchError(null);
    try {
      const data = await searchText(query, selection, page, hadithPageSize);
      if (seq !== searchSeq.current) return;
      setSearchResults(data.results);
      setSearchTotal(data.total);
    } catch (err) {
      if (seq !== searchSeq.current) return;
      setSearchError(err instanceof Error ? err.message : "Search failed");
      setSearchResults([]);
      setSearchTotal(0);
    } finally {
      if (seq === searchSeq.current) setSearchLoading(false);
    }
  };

  // Drop any pending or in-flight search.
  const cancelSearch = () => {
    clearTimeout(rerunTimer.current);
    searchSeq.current++;
    setSearchLoading(false);
  };

  const handleFilterChange = (selection: BookSelection | null) => {
    setFilter(selection);
    if (!searchQuery) return;
    if (!selection) {
      cancelSearch();
      setSearchResults([]);
      setSearchTotal(0);
      setSearchError(null);
      return;
    }
    // Debounced so ticking several boxes sends one request.
    clearTimeout(rerunTimer.current);
    rerunTimer.current = setTimeout(() => handleSearch(searchQuery, 1, selection), 400);
  };

  const clearSearch = () => {
    cancelSearch();
    setSearchQuery("");
    setSearchResults([]);
    setSearchTotal(0);
    setSearchError(null);
    setSearchKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getCollections();
        if (!cancelled) {
          setCollections(data.collections);
          setLevel("collections");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load collections");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleCollectionClick = async (collection: CollectionInfo) => {
    setSelectedCollection(collection);
    setSelectedBook(null);
    setLoading(true);
    setError(null);
    try {
      const data = await getBooks(collection.id);
      setBooks(data.books);
      setLevel("books");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  const handleBookClick = async (book: BookInfo) => {
    setSelectedBook(book);
    setLoading(true);
    setError(null);
    setHadithPage(1);
    try {
      const data = await getBookHadiths(book.id, 1, hadithPageSize);
      setHadiths(data.hadiths);
      setHadithTotal(data.total);
      setLevel("hadiths");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hadiths");
    } finally {
      setLoading(false);
    }
  };

  const handleHadithPageChange = async (page: number) => {
    if (!selectedBook) return;
    setLoading(true);
    setHadithPage(page);
    try {
      const data = await getBookHadiths(selectedBook.id, page, hadithPageSize);
      setHadiths(data.hadiths);
      setHadithTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load hadiths");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (level === "hadiths") {
      setLevel("books");
      setSelectedBook(null);
    } else if (level === "books") {
      setLevel("collections");
      setSelectedCollection(null);
    }
  };

  const breadcrumbs = [
    { label: "Six Books", level: "collections" as ViewLevel },
    ...(selectedCollection
      ? [{ label: selectedCollection.name_en || selectedCollection.id, level: "books" as ViewLevel }]
      : []),
    ...(selectedBook
      ? [{
          label: `Book ${selectedBook.book_number}: ${selectedBook.name_en || ""}`,
          level: "hadiths" as ViewLevel,
        }]
      : []),
  ];

  const hadithTotalPages = Math.ceil(hadithTotal / hadithPageSize);
  const searchTotalPages = Math.ceil(searchTotal / hadithPageSize);

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-12">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Browse &amp; Search the Six Books
            </h1>
            <p className="mt-2 text-stone-500">
              Explore the Kutub al-Sittah, the six canonical hadith collections
            </p>
          </div>

          {/* Keyword Search */}
          <section className="mx-auto mb-10 max-w-3xl">
            <div className="mb-4 rounded-lg border border-primary/20 bg-primary-light/50 p-4 text-sm text-stone-600">
              <p>
                <strong className="text-primary">Keyword search</strong> finds hadith
                whose English text contains your words.
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-stone-500">
                <li>Every word you enter must appear; results are ranked by relevance.</li>
                <li>Words are matched by their root, so &ldquo;fast&rdquo; also finds &ldquo;fasting&rdquo;.</li>
                <li>Arabic text is not searched yet. For meaning-based results, try{" "}
                  <Link href="/search" className="underline text-primary hover:text-primary/80">Free Search</Link>.
                </li>
              </ul>
            </div>
            <div className="mb-3">
              <BookFilter onChange={handleFilterChange} />
            </div>
            <SearchBar
              key={searchKey}
              onSearch={(q) => handleSearch(q, 1)}
              isLoading={searchLoading}
              disabled={!filter}
              placeholder="Enter keywords, e.g. charity neighbour"
            />
          </section>

          {searchQuery ? (
            <section>
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm text-stone-500">
                  {!filter
                    ? <>Select at least one book to search for &ldquo;{searchQuery}&rdquo;</>
                    : searchLoading
                    ? "Searching…"
                    : <>Found <strong>{searchTotal.toLocaleString()}</strong> result{searchTotal !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;</>}
                </p>
                <Button variant="ghost" size="sm" onClick={clearSearch} className="gap-1">
                  <X className="h-4 w-4" />
                  Clear search
                </Button>
              </div>

              {!filter ? null : searchError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                  <p className="text-sm text-red-600">{searchError}</p>
                </div>
              ) : searchLoading ? (
                <div className="flex flex-col gap-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border bg-white p-6">
                      <Skeleton className="h-5 w-1/3 mb-3" />
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  ))}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="rounded-xl border border-border bg-white p-10 text-center">
                  <p className="text-stone-500">No hadith found. Try fewer or different keywords.</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4">
                    {searchResults.map((hadith) => (
                      <HadithCard key={hadith.id} hadith={hadith} />
                    ))}
                  </div>
                  <Pager
                    page={searchPage}
                    totalPages={searchTotalPages}
                    onChange={(p) => handleSearch(searchQuery, p)}
                  />
                </>
              )}
            </section>
          ) : (
            <>

              {/* Breadcrumbs */}
              {breadcrumbs.length > 1 && (
                <div className="mb-6 flex items-center gap-1 text-sm">
                  {breadcrumbs.map((crumb, i) => (
                    <span key={crumb.level} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="h-3 w-3 text-stone-400" />}
                      {i === breadcrumbs.length - 1 ? (
                        <span className="font-medium text-stone-800" aria-current="page">
                          {crumb.label}
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-stone-500 hover:text-primary"
                          onClick={() => {
                            setLevel(crumb.level);
                            if (crumb.level === "collections") setSelectedCollection(null);
                            setSelectedBook(null);
                          }}
                        >
                          {crumb.label}
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              )}

              {/* Back Button */}
              {level !== "collections" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goBack}
                  className="mb-4 gap-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}

              {/* Error */}
              {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Content */}
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border bg-white p-6">
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-1/2 mb-3" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : level === "collections" ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {collections.map((collection) => (
                    <CollectionCard
                      key={collection.id}
                      collection={collection}
                      onClick={() => handleCollectionClick(collection)}
                    />
                  ))}
                </div>
              ) : level === "books" ? (
                <div className="flex flex-col gap-3">
                  {books.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => handleBookClick(book)}
                      className="group flex items-center justify-between rounded-xl border border-border bg-white p-5 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="font-medium text-stone-800 group-hover:text-primary transition-colors">
                            Book {book.book_number}: {book.name_en}
                          </h3>
                          {book.name_ar && (
                            <p dir="rtl" className="mt-0.5 text-sm text-stone-500 font-arabic">
                              {book.name_ar}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="default">
                          {book.hadith_count.toLocaleString()} hadith
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-stone-400 group-hover:text-primary transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                /* Hadiths Level */
                <div>
                  <p className="mb-4 text-sm text-stone-500">
                    Showing{" "}
                    <strong>{(hadithPage - 1) * hadithPageSize + 1}–
                    {Math.min(hadithPage * hadithPageSize, hadithTotal)}</strong>{" "}
                    of <strong>{hadithTotal.toLocaleString()}</strong> hadith
                  </p>

                  <div className="flex flex-col gap-4">
                    {hadiths.map((hadith) => (
                      <HadithCard key={hadith.id} hadith={hadith} />
                    ))}
                  </div>

                  <Pager
                    page={hadithPage}
                    totalPages={hadithTotalPages}
                    onChange={handleHadithPageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

function Pager({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span className="text-sm text-stone-500">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </Button>
    </div>
  );
}
