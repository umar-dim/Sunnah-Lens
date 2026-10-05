import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse & Search the Six Books",
  description:
    "Browse the six canonical hadith collections by book, or search their English text by keyword.",
  openGraph: {
    title: "Browse & Search the Six Books — SUNNAH LENS",
    description:
      "Browse the six canonical hadith collections by book, or search their English text by keyword.",
    url: "https://sunnahlens.com/directory",
  },
};

export default function DirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
