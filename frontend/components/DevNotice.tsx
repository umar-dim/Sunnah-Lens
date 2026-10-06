import { Badge } from "@/components/ui/badge";

const SIX_BOOKS = [
  "Sahih al-Bukhari",
  "Sahih Muslim*",
  "Sunan Abi Dawud",
  "Jami‘ at-Tirmidhi",
  "Sunan an-Nasa'i",
  "Sunan Ibn Majah",
];

export default function DevNotice() {
  return (
    <section className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary" className="mb-4 text-xs">
          In Development
        </Badge>
        <h2 className="text-2xl font-bold tracking-tight text-primary">
          Ask, Search &amp; Browse the Six Books
        </h2>
        <p className="mt-4 text-stone-500 leading-relaxed">
          SUNNAH LENS covers the <strong>Kutub al-Sittah</strong>, the six canonical
          hadith collections:
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-left text-sm text-stone-600 max-w-md mx-auto">
          {SIX_BOOKS.map((book) => (
            <li key={book}>{book}</li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-stone-400">
          * Sahih Muslim includes primary narrations only.
        </p>
        <p className="mt-6 text-stone-500 leading-relaxed">
          <strong>Ask a question</strong>, search, or <strong>browse the directory</strong>{" "}
          by collection and book. Each can be narrowed to the books you choose:
        </p>
        <ul className="mt-4 space-y-2 text-left text-stone-500 leading-relaxed max-w-md mx-auto">
          <li>
            <strong className="text-primary">Ask</strong> — an AI answer drawn only from
            hadith in the six books, each one cited, on the Ask page. Not a religious ruling.
          </li>
          <li>
            <strong className="text-primary">Free Search</strong> — AI-powered
            semantic search using vector embeddings, on the Search page.
          </li>
          <li>
            <strong className="text-primary">Keyword Search</strong> — full-text
            search over the English text, in the Directory.
          </li>
        </ul>
        <p className="mt-4 text-stone-500 leading-relaxed">
          SUNNAH LENS supports{" "}
          <strong>only these six primary books of hadith</strong>.
        </p>
        <p className="mt-4 text-lg font-semibold text-primary">
          Completely free for now.
        </p>
      </div>
    </section>
  );
}
