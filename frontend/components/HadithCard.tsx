import { BookOpen } from "lucide-react";
import { honorifics } from "@/components/Honorific";
import { cn } from "@/lib/utils";
import type { TextHadithResult } from "@/lib/types";

interface HadithCardProps {
  // similarity is present only for semantic search results.
  hadith: TextHadithResult & { similarity?: number };
}

// Colour and dot shape by grade; the label is always the source's own text.
// Grades we can't place stay neutral rather than being guessed.
const GRADES = [
  { match: /maw?d[uū]/i, cls: "bg-grade-mawdu-bg text-grade-mawdu", dot: "rotate-45 rounded-none" },
  { match: /da['ʿ’]?[iī]f/i, cls: "bg-grade-daif-bg text-grade-daif", dot: "rounded-[1px]" },
  { match: /hasan/i, cls: "bg-grade-hasan-bg text-grade-hasan", dot: "rounded-full" },
  { match: /sa?h[iī]h/i, cls: "bg-grade-sahih-bg text-grade-sahih", dot: "rounded-full" },
];

function GradeBadge({ grade }: { grade: string }) {
  const g = GRADES.find((x) => x.match.test(grade));
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[13px] font-bold leading-[18px]",
        g ? g.cls : "bg-surface-sunken text-ink-muted",
      )}
    >
      <span aria-hidden className={cn("size-[7px] bg-current", g ? g.dot : "rounded-full")} />
      {grade}
    </span>
  );
}

export default function HadithCard({ hadith }: HadithCardProps) {
  const text = hadith.text_en || hadith.matn_en || "";
  const textAr = hadith.text_ar || hadith.matn_ar || "";
  const chapter = [hadith.book_name, hadith.chapter_name].filter(Boolean).join(" · ");

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-6 shadow-card-sl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          {hadith.collection_name && (
            <span className="font-display text-xl leading-tight text-ink">{hadith.collection_name}</span>
          )}
          <span className="text-sm font-semibold tabular-nums text-ink-muted">{hadith.hadith_number}</span>
        </div>
        {hadith.grade_en && <GradeBadge grade={hadith.grade_en} />}
      </div>

      {textAr && (
        <p
          dir="rtl"
          lang="ar"
          className="rounded-md bg-surface-sunken px-6 py-4 text-right font-arabic text-2xl leading-[44px] text-ink"
        >
          {textAr}
        </p>
      )}

      {/* Most English texts already open with "Narrated X:"; only add the line when they don't. */}
      {hadith.narrator && !text.includes(hadith.narrator) && (
        <p className="text-sm font-bold text-ink-muted">Narrated by {hadith.narrator}</p>
      )}

      {text && <p className="max-w-[65ch] text-base leading-[26px] text-ink">{honorifics(text)}</p>}

      {(chapter || hadith.similarity !== undefined) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          {chapter && (
            <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
              <BookOpen className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              {chapter}
            </span>
          )}
          {hadith.similarity !== undefined && (
            <span className="ml-auto text-xs text-ink-subtle">
              {Math.round(hadith.similarity * 100)}% match
            </span>
          )}
        </div>
      )}
    </article>
  );
}
