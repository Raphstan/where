import type { Criteria } from "@/lib/ask/schema";
import type { EvidenceLevel } from "@/lib/evidence";
import type { MemoryPlace, MemoryRow } from "@/lib/search/rank";
import type { MemorySignal, SignalAuthor } from "@/lib/search/signal";

/** Données de test reprises de la maquette (PEOPLE, PLACES). */
export const NOW = new Date("2026-10-25T12:00:00Z");

export const SARAH: SignalAuthor = { kind: "member", id: "sarah", name: "Sarah", trustDomains: ["restaurants", "hotels"] };
export const NOAM: SignalAuthor = { kind: "member", id: "noam", name: "Noam", trustDomains: ["nightlife"] };
export const MAYA: SignalAuthor = { kind: "member", id: "maya", name: "Maya", trustDomains: ["restaurants", "activities"] };
export const DAVID: SignalAuthor = { kind: "member", id: "david", name: "David", trustDomains: ["travel", "family", "activities"] };
export const ME: SignalAuthor = { kind: "self" };

export const CIRCLE = new Set(["sarah", "noam", "maya", "david"]);

let seq = 0;

export function sig(
  level: EvidenceLevel,
  author: SignalAuthor,
  opts: { daysAgo?: number; occasion?: string[]; note?: string | null } = {},
): MemorySignal {
  return {
    id: `s${++seq}`,
    level,
    author,
    occasion: opts.occasion ?? [],
    note: opts.note ?? null,
    createdAt: new Date(NOW.getTime() - (opts.daysAgo ?? 10) * 24 * 3600 * 1000),
  };
}

export function place(id: string, overrides: Partial<MemoryPlace> = {}): MemoryPlace {
  return {
    id,
    name: id,
    address: null,
    city: "Tel Aviv",
    area: null,
    kind: null,
    vibe: [],
    noise: null,
    price: null,
    googlePlaceId: null,
    lat: null,
    lng: null,
    websiteUrl: null,
    phone: null,
    whatsapp: null,
    ontopoUrl: null,
    tabitUrl: null,
    ...overrides,
  };
}

export function rows(p: MemoryPlace, signals: MemorySignal[], reusable = true): MemoryRow[] {
  return signals.map((signal) => ({ place: p, signal, reusable }));
}

export function criteria(overrides: Partial<Criteria> = {}): Criteria {
  return {
    city: null,
    area: null,
    when: null,
    partySize: null,
    occasion: null,
    placeKind: null,
    vibe: [],
    constraints: [],
    ...overrides,
  };
}
