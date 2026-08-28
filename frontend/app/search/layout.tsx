import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Hadith",
  description:
    "Search authentic hadith from Bukhari and Muslim collections. Describe what you're looking for and find relevant prophetic traditions.",
  openGraph: {
    title: "Search Hadith — SUNNAH LENS",
    description:
      "Describe what you're looking for and find relevant hadith from authentic Islamic sources.",
    url: "https://sunnahlens.com/search",
  },
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
