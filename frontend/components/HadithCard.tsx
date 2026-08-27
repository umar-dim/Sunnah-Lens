import { Badge } from "@/components/ui/badge";
import type { HadithResult } from "@/lib/types";

interface HadithCardProps {
  hadith: HadithResult;
}

export default function HadithCard({ hadith }: HadithCardProps) {
  const text = hadith.text_en || hadith.matn_en || "";
  const textAr = hadith.text_ar || hadith.matn_ar || "";
  const similarityPercent = Math.round(hadith.similarity * 100);

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

      {hadith.narrator && (
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
          className="mt-4 text-lg leading-loose text-stone-600 font-arabic"
        >
          {textAr}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3">
        {hadith.grade_en && (
          <Badge variant="success">{hadith.grade_en}</Badge>
        )}
        <span className="text-xs text-stone-400">
          {similarityPercent}% match
        </span>
      </div>
    </div>
  );
}
