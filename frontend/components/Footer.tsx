export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-col items-center gap-4 text-center text-sm text-stone-500">
          <div className="font-semibold tracking-tight text-primary">
            SUNNAH LENS
          </div>
          <p>
            Data extracted from{" "}
            <a
              href="https://sunnah.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary"
            >
              sunnah.com
            </a>{" "}
            &middot; Open source on{" "}
            <a
              href="https://github.com/umar-dim/Sunnah-Lens"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary"
            >
              GitHub
            </a>
          </p>
          <p className="text-xs text-stone-500">
            &copy; {new Date().getFullYear()} SUNNAH LENS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
