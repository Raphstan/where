import { evidenceRank, memoryLabel, type PersonalEvidenceLevel } from "@/lib/evidence";
import type { ReservationKind } from "@/lib/inbound/rules";
import { fold, kindCategories } from "@/lib/search/match";

/** Filtres de la mémoire, mot pour mot depuis docs/prototype.html (scrMemory, F). */
export const MEMORY_FILTERS = [
  ["tous", "Tout"],
  ["restaurants", "Restaurants"],
  ["hotels", "Hôtels"],
  ["bars", "Bars"],
  ["cafes", "Cafés"],
  ["activites", "Activités"],
  ["voyages", "Voyages"],
] as const;

export type MemoryFilter = (typeof MEMORY_FILTERS)[number][0];
export type MemoryCategory = Exclude<MemoryFilter, "tous">;

export function isMemoryFilter(value: unknown): value is MemoryFilter {
  return typeof value === "string" && MEMORY_FILTERS.some(([k]) => k === value);
}

const FROM_RESERVATION: Record<ReservationKind, MemoryCategory> = {
  table: "restaurants",
  hotel: "hotels",
  activity: "activites",
};

/**
 * Catégorie d'un lieu de la mémoire, d'après son type en clair (« Bar-restaurant » → bars), sinon
 * d'après l'email qui l'a importé (réservation de table → restaurants). null : seulement sous « Tout ».
 */
export function memoryCategory(kind: string | null, imported: ReservationKind | null = null): MemoryCategory | null {
  const c = kindCategories(kind);
  if (c.has("hotel")) return "hotels";
  if (c.has("cafe")) return "cafes";
  if (c.has("bar")) return "bars";
  if (c.has("restaurant")) return "restaurants";
  if (c.has("activity") || c.has("beach")) return "activites";
  if (kind && /\b(voyage|vol|circuit|city trip)\b/.test(fold(kind))) return "voyages";
  return imported ? FROM_RESERVATION[imported] : null;
}

/** Un signal de la mémoire, tel que la page le lit sous RLS. */
export type MemorySignalRow = {
  place: { id: string; name: string; city: string | null; kind: string | null };
  level: PersonalEvidenceLevel | "public";
  /** Proche à qui la preuve est attribuée ; null = l'utilisateur lui-même. */
  member: { id: string; name: string } | null;
  createdAt: Date;
  /** Type de la réservation importée pour ce lieu, s'il y en a une. */
  imported: ReservationKind | null;
};

export type MemoryItem = {
  placeId: string;
  name: string;
  city: string | null;
  category: MemoryCategory | null;
  level: PersonalEvidenceLevel;
  /** Libellé court de la maquette : « Recommandé par Sarah », « Visité ». */
  label: string;
};

export type MemoryStats = { visited: number; recosReceived: number; cities: number };

/**
 * Un lieu par carte, avec sa preuve la plus forte (à égalité, la plus récente). Le niveau `public`
 * n'entre jamais dans la mémoire personnelle. Les lieux sont triés par preuve la plus récente.
 */
export function buildMemory(rows: readonly MemorySignalRow[]): MemoryItem[] {
  const best = new Map<string, { row: MemorySignalRow & { level: PersonalEvidenceLevel }; latest: number; imported: ReservationKind | null }>();
  for (const r of rows) {
    if (r.level === "public") continue;
    const row = r as MemorySignalRow & { level: PersonalEvidenceLevel };
    const cur = best.get(r.place.id);
    const t = r.createdAt.getTime();
    if (!cur) {
      best.set(r.place.id, { row, latest: t, imported: r.imported });
      continue;
    }
    cur.latest = Math.max(cur.latest, t);
    cur.imported ??= r.imported;
    const d = evidenceRank(row.level) - evidenceRank(cur.row.level);
    if (d < 0 || (d === 0 && t > cur.row.createdAt.getTime())) cur.row = row;
  }
  return [...best.values()]
    .sort((a, b) => b.latest - a.latest)
    .map(({ row, imported }) => ({
      placeId: row.place.id,
      name: row.place.name,
      city: row.place.city,
      category: memoryCategory(row.place.kind, imported),
      level: row.level,
      label: memoryLabel(row.level, row.member?.name),
    }));
}

/**
 * Chiffres de la maquette (« lieux visités », « recos reçues », « villes ») :
 * lieux où l'utilisateur est allé de son propre aveu (visité ou recommandé par lui) ; recommandations
 * explicites reçues de son cercle (une par proche et par lieu) ; villes distinctes de la mémoire.
 */
export function memoryStats(rows: readonly MemorySignalRow[]): MemoryStats {
  const visited = new Set<string>();
  const recos = new Set<string>();
  const cities = new Set<string>();
  for (const r of rows) {
    if (r.level === "public") continue;
    if (r.member === null && (r.level === "visited" || r.level === "recommended")) visited.add(r.place.id);
    if (r.member !== null && r.level === "recommended") recos.add(`${r.member.id}:${r.place.id}`);
    if (r.place.city) cities.add(fold(r.place.city));
  }
  return { visited: visited.size, recosReceived: recos.size, cities: cities.size };
}

export function filterMemory(items: readonly MemoryItem[], filter: MemoryFilter): MemoryItem[] {
  return filter === "tous" ? [...items] : items.filter((i) => i.category === filter);
}
