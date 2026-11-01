/** Mascotte « 3 » de WH3RE (landing wh3re.com, favicon.svg). */
export function Mascot({ className = "size-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" aria-hidden className={className}>
      <path
        d="M30 34 C40 12 92 8 92 38 C92 58 72 64 58 66 C78 66 100 76 98 100 C96 128 52 136 26 114"
        fill="none"
        stroke="var(--color-orange)"
        strokeWidth="26"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <ellipse cx="52" cy="33" rx="5.5" ry="7.5" fill="var(--color-ink)" />
      <ellipse cx="72" cy="29" rx="5.5" ry="7.5" fill="var(--color-ink)" />
    </svg>
  );
}

/** Wordmark « WH3RE » de la landing : mascotte orange + nom en Bricolage Grotesque. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-display text-[19px] font-extrabold tracking-[-0.01em] ${className}`}>
      <Mascot className="h-[24px] w-[21px]" />
      WH3RE
    </span>
  );
}
