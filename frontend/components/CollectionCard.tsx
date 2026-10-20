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
      className="group rounded-lg border border-border bg-surface p-6 text-left shadow-card-sl transition-all hover:border-primary/30 hover:shadow-raised-sl hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink group-hover:text-primary transition-colors">
            {collection.name_en}
          </h3>
          {collection.name_ar && (
            <p dir="rtl" lang="ar" className="mt-1 font-arabic text-[22px] leading-[1.8] text-ink-muted">
              {collection.name_ar}
            </p>
          )}
        </div>
        <BookOpen className="h-5 w-5 text-ink-subtle group-hover:text-primary transition-colors" />
      </div>

      <div className="mt-3 flex items-center gap-3">
        {collection.author_en && (
          <span className="text-sm text-ink-subtle">
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
