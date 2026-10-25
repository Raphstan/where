import type { EvidenceLevel } from "@/lib/evidence";
import type { ConfidenceLevel, Person } from "@/lib/search/types";

/** Pastille d'un niveau de preuve (maquette .ev) ; `deduction` = point encre de « déduction WHERE ». */
const DOT: Record<EvidenceLevel | "deduction", string> = {
  recommended: "bg-coral",
  visited: "bg-olive",
  booked_confirmed: "bg-blue",
  booked: "bg-blue",
  saved: "bg-amber",
  public: "border-[1.5px] border-soft bg-transparent",
  deduction: "bg-ink",
};

export function EvidenceDot({ level }: { level: EvidenceLevel | "deduction" }) {
  return (
    <i aria-hidden className={`inline-block size-[9px] shrink-0 rounded-full shadow-[0_0_0_3px_var(--color-cream-2)] ${DOT[level]}`} />
  );
}

export function EvidenceText({ level, children }: { level: EvidenceLevel | "deduction"; children: string }) {
  return (
    <span className="inline-flex items-center gap-[7px] text-[12.5px] text-ink-2">
      <EvidenceDot level={level} />
      <span>{children}</span>
    </span>
  );
}

const CONF: Record<ConfidenceLevel, { pill: string; on: number }> = {
  forte: { pill: "bg-olive-2 text-olive", on: 3 },
  moyenne: { pill: "bg-amber-2 text-[#8e6a22]", on: 2 },
  explo: { pill: "bg-blue-2 text-blue", on: 1 },
};

/** Pastille de confiance à trois barres (maquette .conf). */
export function ConfidencePill({ level, text }: { level: ConfidenceLevel; text: string }) {
  const { pill, on } = CONF[level];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[12.5px] font-bold ${pill}`}>
      <span aria-hidden className="inline-flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <i key={i} className={`h-[11px] w-[5px] rounded-[2px] bg-current ${i < on ? "opacity-100" : "opacity-25"}`} />
        ))}
      </span>
      {text}
    </span>
  );
}

/** Dégradés des avatars de la maquette (.av.sarah, .noam, .maya, .david). */
const AVATAR_GRADIENTS = [
  "from-[#e58a6f] to-[#b9553f]",
  "from-[#3e7f9f] to-[#1f4f68]",
  "from-[#c8a35a] to-[#8c6a2a]",
  "from-[#6d8f67] to-[#3e5e3a]",
];

export function hashIndex(id: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % modulo;
}

const AVATAR_SIZE = {
  sm: "size-[26px] text-[11px]",
  md: "size-[34px] text-[13px]",
  lg: "size-[52px] text-[19px]",
} as const;

export function PersonAvatar({ person, size = "md" }: { person: Person; size?: keyof typeof AVATAR_SIZE }) {
  const dims = AVATAR_SIZE[size];
  return (
    <span
      title={person.name}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-linear-145 font-display font-bold text-white shadow-[inset_0_-6px_12px_rgba(0,0,0,0.12)] ${dims} ${AVATAR_GRADIENTS[hashIndex(person.id, AVATAR_GRADIENTS.length)]}`}
    >
      {person.initial}
    </span>
  );
}

export function PeopleStack({ people }: { people: Person[] }) {
  return (
    <span className="inline-flex" aria-label={people.map((p) => p.name).join(", ")}>
      {people.map((p, i) => (
        <span key={p.id} className={`rounded-full border-2 border-cream-2 ${i > 0 ? "-ml-2" : ""}`}>
          <PersonAvatar person={p} size="sm" />
        </span>
      ))}
    </span>
  );
}
