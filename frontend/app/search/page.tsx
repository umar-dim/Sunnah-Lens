"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SearchBar from "@/components/SearchBar";
import HadithList from "@/components/HadithList";
import { searchHadith } from "@/lib/api";
import type { HadithResult } from "@/lib/types";

export default function SearchPage() {
  const [results, setResults] = useState<HadithResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await searchHadith(query, 7);
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setResults([]);
    } finally {
      setIsLoading(false);
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
              Describe what you&apos;re looking for and find relevant hadith
            </p>
          </div>

          <SearchBar onSearch={handleSearch} isLoading={isLoading} />

          <div className="mt-8">
            <HadithList
              results={results}
              isLoading={isLoading}
              error={error}
              hasSearched={hasSearched}
            />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
