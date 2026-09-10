"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        <Link href="/" className="text-xl font-bold tracking-tight text-primary">
          SUNNAH LENS
        </Link>
        <nav className="flex items-center gap-3">
          <Link href="/search">
            <Button variant={pathname === "/search" ? "default" : "ghost"}>
              Search
            </Button>
          </Link>
          <Link href="/directory">
            <Button variant={pathname === "/directory" ? "default" : "ghost"}>
              Directory
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
