import Link from "next/link";
import { MessageCircleQuestion } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { honorifics } from "@/components/Honorific";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";

export default function Hero() {
  return (
    <section className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <h1>
        <Logo size={56} className="sm:hidden" />
        <Logo size={72} className="hidden sm:inline-flex" />
        <span className="sr-only">SunnahLens</span>
      </h1>
      <p className="mt-6 max-w-2xl font-display text-2xl leading-snug text-ink sm:text-[28px]">
        Ask a question in your own words.{" "}
        <br className="hidden sm:inline" />
        Get an answer drawn from authentic hadith.
      </p>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-subtle">
        {honorifics(
          "The Sunnah of the Prophet Muhammad ﷺ is the second source of guidance in Islam after the Quran. " +
            "With SunnahLens you can ask about prayer, family, manners or anything in your daily life, " +
            "and read a short answer taken only from the six books of hadith, with every narration it uses " +
            "named and one tap away.",
        )}
      </p>
      <Link href="/chat" className={cn(buttonVariants({ size: "lg" }), "mt-10")}>
        <MessageCircleQuestion className="h-5 w-5" aria-hidden />
        Ask a question
      </Link>
      <p className="mt-4 text-sm text-ink-subtle">
        Prefer to read the hadith yourself?{" "}
        <Link
          href="/search"
          className="font-medium text-primary underline underline-offset-4 hover:text-primary-deep"
        >
          Search
        </Link>{" "}
        or{" "}
        <Link
          href="/directory"
          className="font-medium text-primary underline underline-offset-4 hover:text-primary-deep"
        >
          browse the collections
        </Link>
        .
      </p>
      <p className="mt-6 max-w-md text-xs text-ink-subtle">
        Answers are written by AI from the cited hadith and are not religious rulings.
      </p>
    </section>
  );
}
