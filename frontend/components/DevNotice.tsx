import { Badge } from "@/components/ui/badge";

export default function DevNotice() {
  return (
    <section className="border-t border-border px-6 py-16">
      <div className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary" className="mb-4 text-xs">
          In Development
        </Badge>
        <h2 className="text-2xl font-bold tracking-tight text-stone-800">
          Currently Supporting Partial Collections
        </h2>
        <p className="mt-4 text-stone-500 leading-relaxed">
          SUNNAH LENS is currently in development. We are supporting search on a
          portion of <strong>Sahih Bukhari</strong> and <strong>Sahih
          Muslim</strong> collections.
        </p>
        <p className="mt-2 text-stone-500 leading-relaxed">
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
