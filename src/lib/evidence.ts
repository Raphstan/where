import type { Database } from "@/lib/supabase/database.types";

type DbEvidenceLevel = Database["public"]["Enums"]["evidence_level"];

/**
 * Niveaux de preuve, du plus fort au plus faible (CLAUDE.md § 2.3).
 * Doit rester identique à l'enum Postgres `evidence_level` : la contrainte de type ci-dessous
 * casse la compilation si l'un des deux diverge.
 */
export const EVIDENCE_LEVELS = [
  "recommended",
  "visited",
  "booked_confirmed",
  "booked",
  "saved",
  "public",
] as const satisfies readonly DbEvidenceLevel[];

export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

// Vérification dans l'autre sens : toute valeur de l'enum Postgres est couverte ici.
type MissingInTs = Exclude<DbEvidenceLevel, EvidenceLevel>;
const _everyDbLevelIsCovered: MissingInTs extends never ? true : never = true;
void _everyDbLevelIsCovered;

/** Libellé long, mot pour mot depuis docs/prototype.html (EVLABEL et whyBody). */
export const EVIDENCE_LABEL_LONG: Readonly<Record<EvidenceLevel, string>> = {
  recommended: "Recommandé explicitement",
  visited: "Visité et confirmé",
  booked_confirmed: "Réservation confirmée",
  booked: "Réservation confirmée / signal post-visite",
  saved: "Sauvegardé ou partagé",
  public: "Information publique",
};

export type PersonalEvidenceLevel = Exclude<EvidenceLevel, "public">;

/** Libellé court, mot pour mot depuis docs/prototype.html (scrMemory, evTxt). */
export const EVIDENCE_LABEL_SHORT: Readonly<Record<PersonalEvidenceLevel, string>> = {
  recommended: "Recommandé",
  visited: "Visité",
  booked_confirmed: "Réservé",
  booked: "Réservé",
  saved: "Sauvegardé",
};

export function isEvidenceLevel(value: unknown): value is EvidenceLevel {
  return typeof value === "string" && (EVIDENCE_LEVELS as readonly string[]).includes(value);
}

/** Rang de force : 0 = le plus fort. */
export function evidenceRank(level: EvidenceLevel): number {
  return EVIDENCE_LEVELS.indexOf(level);
}

/** Trie du plus fort au plus faible. */
export function sortByStrength<T extends { evidence_level: EvidenceLevel }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => evidenceRank(a.evidence_level) - evidenceRank(b.evidence_level));
}

/**
 * Libellé court de la mémoire : « Recommandé », ou « Recommandé par Sarah » quand le signal
 * vient d'un proche. Le niveau `public` n'a pas de place dans la mémoire personnelle.
 */
export function memoryLabel(level: EvidenceLevel, authorFirstName?: string | null): string {
  if (level === "public") {
    throw new Error("Un signal public n'apparaît pas dans la mémoire personnelle.");
  }
  const base = EVIDENCE_LABEL_SHORT[level];
  return authorFirstName ? `${base} par ${authorFirstName}` : base;
}
