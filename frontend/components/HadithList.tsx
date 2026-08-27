"use client";

import { Skeleton } from "@/components/ui/skeleton";
import HadithCard from "./HadithCard";
import type { HadithResult } from "@/lib/types";

interface HadithListProps {
  results: HadithResult[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
}

export default function HadithList({
  results,
  isLoading,
  error,
  hasSearched,
}: HadithListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-white p-6">
            <div className="flex gap-2 mb-3">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6 mb-2" />
            <Skeleton className="h-4 w-3/4" />
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
          Search for any Islamic topic to find relevant hadith
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {results.map((hadith) => (
        <HadithCard key={hadith.id} hadith={hadith} />
      ))}
    </div>
  );
}
