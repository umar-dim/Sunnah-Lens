"use client";

import { Badge } from "@/components/ui/badge";
import type { CollectionInfo } from "@/lib/types";
import { BookOpen } from "lucide-react";

interface CollectionCardProps {
  collection: CollectionInfo;
  onClick: () => void;
}

export default function CollectionCard({ collection, onClick }: CollectionCardProps) {
  return (
    <button
      onClick={onClick}
      className="group rounded-xl border border-border bg-white p-6 text-left shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-stone-800 group-hover:text-primary transition-colors">
            {collection.name_en}
          </h3>
          {collection.name_ar && (
            <p dir="rtl" lang="ar" className="mt-1 text-base text-stone-500 font-arabic">
              {collection.name_ar}
            </p>
          )}
        </div>
        <BookOpen className="h-5 w-5 text-stone-400 group-hover:text-primary transition-colors" />
      </div>

      <div className="mt-3 flex items-center gap-3">
        {collection.author_en && (
          <span className="text-sm text-stone-500">
            {collection.author_en}
          </span>
        )}
      </div>

      <div className="mt-4">
        <Badge variant="default">
          {collection.hadith_count.toLocaleString()} hadith
        </Badge>
      </div>
    </button>
  );
}
