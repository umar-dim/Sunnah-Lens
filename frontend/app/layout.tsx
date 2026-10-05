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
  metadataBase: new URL("https://sunnahlens.com"),
  title: {
    default: "SUNNAH LENS — Ask and Search Authentic Hadith",
    template: "%s | SUNNAH LENS",
  },
  description:
    "Ask a question in your own words and get an answer drawn from cited, authentic hadith. A free tool to ask about, search and browse the six canonical hadith collections (Kutub al-Sittah) — Bukhari, Muslim, Abu Dawud, Tirmidhi, an-Nasa'i and Ibn Majah.",
  keywords: [
    "hadith",
    "sunnah",
    "islam",
    "bukhari",
    "muslim",
    "abu dawud",
    "tirmidhi",
    "nasai",
    "ibn majah",
    "kutub al-sittah",
    "six books",
    "prophet muhammad",
    "search hadith",
    "authentic hadith",
  ],
  authors: [{ name: "SUNNAH LENS" }],
  creator: "SUNNAH LENS",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sunnahlens.com",
    siteName: "SUNNAH LENS",
    title: "SUNNAH LENS — Ask and Search Authentic Hadith",
    description:
      "Ask a question in your own words and get an answer drawn from cited, authentic hadith in the six books.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "SUNNAH LENS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SUNNAH LENS — Ask and Search Authentic Hadith",
    description:
      "Ask a question in your own words and get an answer drawn from cited, authentic hadith in the six books.",
    images: ["/opengraph-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
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
