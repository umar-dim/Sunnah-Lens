import { cn } from "@/lib/utils";

// Star Lens mark, ported from sunnahlens-design-system/components/bundle.js.
// Colours come from .sl-mark in globals.css so it follows the theme.
function Mark({ size }: { size: number }) {
  return (
    <svg className="sl-mark shrink-0" width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <circle cx={60} cy={60} r={52} fill="none" stroke="var(--mark-ink)" strokeWidth={7} />
      <rect x={34} y={34} width={52} height={52} fill="var(--mark-gold)" />
      <polygon points="60,23.2 96.8,60 60,96.8 23.2,60" fill="var(--mark-gold)" />
      <circle cx={60} cy={60} r={14} fill="var(--mark-core)" />
      {size >= 32 && (
        <>
          <circle cx={55} cy={55} r={4} fill="var(--brand-ivory)" />
          <path d="M22 44 A42 42 0 0 1 44 22" fill="none" stroke="var(--mark-gold)" strokeWidth={4} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)} style={{ gap: size * 0.32 }}>
      <Mark size={size} />
      <span
        className="sl-logo-word font-display leading-none tracking-[-0.01em]"
        style={{ fontSize: size * 0.72 }}
      >
        Sunnah<span className="sl-logo-lens">Lens</span>
      </span>
    </span>
  );
}
