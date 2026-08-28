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
    default: "SUNNAH LENS — Search Authentic Hadith",
    template: "%s | SUNNAH LENS",
  },
  description:
    "Find hadith by searching for it. A free tool to search authentic hadith from Bukhari and Muslim collections using AI-powered vector search.",
  keywords: [
    "hadith",
    "sunnah",
    "islam",
    "bukhari",
    "muslim",
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
    title: "SUNNAH LENS — Search Authentic Hadith",
    description:
      "Find hadith by searching for it. Powered by vector search on authentic Islamic sources.",
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
    title: "SUNNAH LENS — Search Authentic Hadith",
    description:
      "Find hadith by searching for it. Powered by vector search on authentic Islamic sources.",
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
