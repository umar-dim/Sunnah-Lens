import { Badge } from "@/components/ui/badge";

export default function DevNotice() {
  return (
    <section className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary" className="mb-4 text-xs">
          In Development
        </Badge>
        <h2 className="text-2xl font-bold tracking-tight text-stone-800">
          Browse & Search the Nine Books
        </h2>
        <p className="mt-4 text-stone-500 leading-relaxed">
          SUNNAH LENS provides access to the nine canonical hadith collections.
          You can <strong>browse the full directory</strong> of collections, books,
          and chapters, or search using two modes:
        </p>
        <ul className="mt-4 space-y-2 text-left text-stone-500 leading-relaxed max-w-md mx-auto">
          <li>
            <strong className="text-primary">Free Search</strong> — AI-powered
            semantic search using vector embeddings. Currently covers a portion
            of <strong>Sahih al-Bukhari</strong> and <strong>Sahih Muslim</strong>.
          </li>
          <li>
            <strong className="text-primary">Text Search</strong> — Keyword-based
            full-text search across all imported hadith collections.
          </li>
        </ul>
        <p className="mt-4 text-stone-500 leading-relaxed">
          Our goal is to support{" "}
          <strong>all ~50,000 authenticated hadith</strong> by the end of 2026.
        </p>
        <p className="mt-4 text-lg font-semibold text-primary">
          Completely free for now.
        </p>
      </div>
    </section>
  );
}
