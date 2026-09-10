"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CollectionCard from "@/components/CollectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getCollections, getBooks, getBookHadiths } from "@/lib/api";
import type {
  CollectionInfo,
  BookInfo,
  TextHadithResult,
} from "@/lib/types";
import {
  ChevronRight,
  BookOpen,
  ArrowLeft,
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
    { label: "Nine Collections", level: "collections" as ViewLevel },
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

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-5xl px-6 py-12">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Browse the Nine Books
            </h1>
            <p className="mt-2 text-stone-500">
              Explore the canonical hadith collections of Islam
            </p>
          </div>

          {/* Breadcrumbs */}
          {breadcrumbs.length > 1 && (
            <div className="mb-6 flex items-center gap-1 text-sm">
              {breadcrumbs.map((crumb, i) => (
                <span key={crumb.level} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-stone-400" />}
                  <span
                    className={
                      i === breadcrumbs.length - 1
                        ? "font-medium text-stone-800"
                        : "cursor-pointer text-stone-500 hover:text-primary"
                    }
                    onClick={() => {
                      if (i < breadcrumbs.length - 1) {
                        if (crumb.level === "collections") {
                          setLevel("collections");
                          setSelectedCollection(null);
                          setSelectedBook(null);
                        } else if (crumb.level === "books") {
                          setLevel("books");
                          setSelectedBook(null);
                        }
                      }
                    }}
                  >
                    {crumb.label}
                  </span>
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
                  <div
                    key={hadith.id}
                    className="rounded-xl border border-border bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {hadith.collection_name && (
                        <Badge variant="default">{hadith.collection_name}</Badge>
                      )}
                      {hadith.book_name && (
                        <Badge variant="secondary">{hadith.book_name}</Badge>
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
              {hadithTotalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={hadithPage <= 1}
                    onClick={() => handleHadithPageChange(hadithPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-stone-500">
                    Page {hadithPage} of {hadithTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={hadithPage >= hadithTotalPages}
                    onClick={() => handleHadithPageChange(hadithPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
