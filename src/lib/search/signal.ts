import type { EvidenceLevel } from "@/lib/evidence";

/** Auteur d'un signal : l'utilisateur lui-même, ou un proche de son cercle. Jamais une inférence. */
export type SignalAuthor =
  | { kind: "self" }
  | { kind: "member"; id: string; name: string; trustDomains: readonly string[] };

/** Signal de la mémoire, tel que la recherche le manipule (indépendant de Supabase). */
export type MemorySignal = {
  id: string;
  level: EvidenceLevel;
  author: SignalAuthor;
  occasion: readonly string[];
  note: string | null;
  createdAt: Date;
};

/** Au-delà, une recommandation est « ancienne » (maquette : « Cette recommandation date de trois ans »). */
export const STALE_AFTER_YEARS = 2;

const YEAR_MS = 365.25 * 24 * 3600 * 1000;

export function ageInYears(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / YEAR_MS);
}

export function isStale(signal: Pick<MemorySignal, "createdAt">, now: Date): boolean {
  return ageInYears(signal.createdAt, now) >= STALE_AFTER_YEARS;
}

export function authorKey(author: SignalAuthor): string {
  return author.kind === "self" ? "self" : `member:${author.id}`;
}

export function isPersonal(signal: Pick<MemorySignal, "level">): boolean {
  return signal.level !== "public";
}

/**
 * Un signal par couple (auteur, niveau) : deux réservations de David au même endroit ne font pas
 * deux preuves. On garde le plus récent.
 */
export function distinctSignals<T extends MemorySignal>(signals: readonly T[]): T[] {
  const byKey = new Map<string, T>();
  for (const s of signals) {
    const key = `${authorKey(s.author)}|${s.level}`;
    const existing = byKey.get(key);
    if (!existing || existing.createdAt < s.createdAt) byKey.set(key, s);
  }
  return [...byKey.values()];
}
