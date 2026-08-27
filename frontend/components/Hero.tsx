import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Hero() {
  return (
    <section className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-5xl font-bold tracking-tight text-primary sm:text-6xl">
        SUNNAH LENS
      </h1>
      <p className="mt-4 text-xl text-stone-600">
        Find hadith by searching for it
      </p>
      <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone-500">
        The Sunnah of the Prophet Muhammad ﷺ is the second most important
        source of guidance in Islam after the Quran. Learning and following the
        prophetic traditions helps us live our lives in a way that is pleasing to
        Allah ﷻ, drawing closer to the authentic path laid out for us over 1400
        years ago. With SUNNAH LENS, you can explore these traditions in an
        instant — simply describe what you&apos;re looking for, and find the
        relevant hadith.
      </p>
      <Link href="/search" className="mt-10">
        <Button size="lg">Start Searching</Button>
      </Link>
    </section>
  );
}
