import type { Metadata } from "next";
import { Amiri, DM_Serif_Display, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sunnahlens.com"),
  title: {
    default: "SunnahLens — Ask and Search Authentic Hadith",
    template: "%s | SunnahLens",
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
  authors: [{ name: "SunnahLens" }],
  creator: "SunnahLens",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://sunnahlens.com",
    siteName: "SunnahLens",
    title: "SunnahLens — Ask and Search Authentic Hadith",
    description:
      "Ask a question in your own words and get an answer drawn from cited, authentic hadith in the six books.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "SunnahLens",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SunnahLens — Ask and Search Authentic Hadith",
    description:
      "Ask a question in your own words and get an answer drawn from cited, authentic hadith in the six books.",
    images: ["/opengraph-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${dmSerif.variable} ${amiri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
