import { Badge } from "@/components/ui/badge";
import type { TextHadithResult } from "@/lib/types";

interface HadithCardProps {
  // similarity is present only for semantic search results.
  hadith: TextHadithResult & { similarity?: number };
}

export default function HadithCard({ hadith }: HadithCardProps) {
  const text = hadith.text_en || hadith.matn_en || "";
  const textAr = hadith.text_ar || hadith.matn_ar || "";

  return (
    <div className="rounded-xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
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

      {/* Most English texts already open with "Narrated X:"; only add the line when they don't. */}
      {hadith.narrator && !text.includes(hadith.narrator) && (
        <p className="mb-2 text-sm italic text-stone-500">
          Narrated by {hadith.narrator}
        </p>
      )}

      {text && (
        <p className="text-base leading-relaxed text-stone-800">{text}</p>
      )}

      {textAr && (
        <p
          dir="rtl"
          lang="ar"
          className="mt-4 text-lg leading-loose text-stone-600 font-arabic"
        >
          {textAr}
        </p>
      )}

      {(hadith.grade_en || hadith.similarity !== undefined) && (
        <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
          {hadith.grade_en && (
            <Badge variant="success">{hadith.grade_en}</Badge>
          )}
          {hadith.similarity !== undefined && (
            <span className="ml-auto text-xs text-stone-400">
              {Math.round(hadith.similarity * 100)}% match
            </span>
          )}
        </div>
      )}
    </div>
  );
}
