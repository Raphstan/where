import type { BookingKind } from "@/lib/booking/options";

/** Pastille de chaque moyen, reprise de la maquette (.src-logo ontopo, tabit, site, tel, wa, gm). */
const LOGO: Record<BookingKind, { cls: string; t: string }> = {
  ontopo: { cls: "bg-blue text-white", t: "O" },
  tabit: { cls: "bg-[#1a1a1a] text-white", t: "T" },
  site: { cls: "bg-sand-2 text-ink", t: "↗" },
  tel: { cls: "bg-sand-2 text-ink", t: "☎" },
  wa: { cls: "bg-[#25d366] text-white", t: "W" },
  maps: { cls: "bg-[#34a853] text-white", t: "M" },
};

export function PlatformLogo({ kind }: { kind: BookingKind }) {
  const l = LOGO[kind];
  return (
    <span
      aria-hidden
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-extrabold tracking-[0.02em] ${l.cls}`}
    >
      {l.t}
    </span>
  );
}
