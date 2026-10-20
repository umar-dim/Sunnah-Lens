"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";

const links = [
  { href: "/search", label: "Search" },
  { href: "/directory", label: "Directory" },
  { href: "/chat", label: "Ask" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="SunnahLens home" className="whitespace-nowrap rounded-sm">
          <Logo size={32} />
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  buttonVariants({ variant: active ? "default" : "ghost", size: "sm" }),
                  "px-3 sm:px-5",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
