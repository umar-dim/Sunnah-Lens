"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import HadithList from "@/components/HadithList";
import BookFilter from "@/components/BookFilter";
import { searchHadith } from "@/lib/api";
import type { BookSelection, HadithResult } from "@/lib/types";

export default function SearchPage() {
  const [results, setResults] = useState<HadithResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [filter, setFilter] = useState<BookSelection | null>({
    collection_ids: null,
    book_ids: null,
  });

  const handleSearch = async (query: string) => {
    if (!filter) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const data = await searchHadith(query, 7, filter);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Search Hadith
            </h1>
            <p className="mt-2 text-stone-500">
              Describe what you&apos;re looking for in your own words
            </p>
          </div>

          <div className="mb-6 rounded-lg border border-primary/20 bg-primary-light/50 p-4 text-center">
            <p className="text-sm text-stone-600">
              <strong className="text-primary">Free Search</strong> uses AI-powered
              semantic embeddings to match meaning, not just exact words, across
              the six books.
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Looking for an exact word or phrase? Use{" "}
              <Link href="/directory" className="underline text-primary hover:text-primary/80">
                keyword search in the Directory
              </Link>
              .
            </p>
          </div>

          <div className="mb-4">
            <BookFilter onChange={setFilter} />
          </div>

          <SearchBar
            onSearch={handleSearch}
            isLoading={loading}
            disabled={!filter}
            placeholder="Describe what you're looking for..."
          />

          <div className="mt-8">
            <HadithList
              results={results}
              isLoading={loading}
              error={error}
              hasSearched={searched}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
