import type { ReservationKind } from "@/lib/inbound/rules";

/** Pastille de la plateforme émettrice (maquette .src-logo tabit, resy, ot, restu, ontopo, booking, gcal). */
const LOGOS: readonly [RegExp, string, string][] = [
  [/tabit/i, "bg-[#1a1a1a] text-white", "T"],
  [/ontopo/i, "bg-blue text-white", "O"],
  [/resy/i, "bg-[#e5342b] text-white", "R"],
  [/opentable/i, "bg-[#da3743] text-white", "OT"],
  [/restu/i, "bg-[#3a6ea5] text-white", "Re"],
  [/booking/i, "bg-[#003580] text-white", "B"],
];

export function SourceLogo({ platform, kind }: { platform: string | null; kind?: ReservationKind | "delivery" }) {
  const [, cls, t] = LOGOS.find(([re]) => re.test(platform ?? "")) ?? [null, kind === "table" ? "bg-sand-2 text-ink" : "bg-[#4285f4] text-white", "✦"];
  return (
    <span
      aria-hidden
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-extrabold tracking-[0.02em] ${cls}`}
    >
      {t}
    </span>
  );
}
