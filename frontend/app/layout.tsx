import type { Metadata } from "next";
import { Public_Sans, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  display: "swap",
});

const notoSansArabic = Noto_Sans_Arabic({
  variable: "--font-noto-sans-arabic",
  subsets: ["arabic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SUNNAH LENS",
  description:
    "Find hadith by searching for it. A free tool to search authentic hadith from Bukhari and Muslim collections.",
  openGraph: {
    title: "SUNNAH LENS",
    description:
      "Find hadith by searching for it. Powered by vector search on authentic Islamic sources.",
    siteName: "SUNNAH LENS",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${publicSans.variable} ${notoSansArabic.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
