import { Fragment, type ReactNode } from "react";

// ﷺ and ﷻ are single ligature glyphs that render at about half the x-height inside
// Latin text. Scale them up so the honorific reads at the size of the words around it.
export function honorifics(text: string): ReactNode {
  const parts = text.split(/([ﷺﷻ])/);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 ? (
      <span key={i} className="font-arabic text-[1.4em] leading-none">
        {part}
      </span>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}
