import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ask about the Sunnah",
  description:
    "Ask a question in your own words and get a short answer drawn from authentic hadith in the six canonical collections, with every source cited.",
  openGraph: {
    title: "Ask about the Sunnah — SUNNAH LENS",
    description:
      "Ask a question and get an answer drawn from cited hadith in the six canonical collections.",
    url: "https://sunnahlens.com/chat",
  },
};

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
