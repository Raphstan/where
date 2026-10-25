import type { Criteria } from "@/lib/ask/schema";
import { bookingOptions, mapsUrl } from "@/lib/booking/options";
import { evidenceRank, type EvidenceLevel } from "@/lib/evidence";
import { CONFIDENCE_ORDER, computeConfidence } from "./confidence";
import {
  areaMatches,
  fold,
  kindCategories,
  matchedVibes,
  placeMatchesCriteria,
  trustDomainsFor,
  type PlaceFacts,
} from "./match";
import {
  BEST_MATCH_HEADLINE,
  deductionLine,
  evidenceLine,
  personalUnknowns,
  rankLabel,
  staleNotice,
} from "./phrasing";
import { distinctSignals, isPersonal, isStale, type MemorySignal } from "./signal";
import type { EvidenceLine, Person, SearchResult } from "./types";

export const MAX_RESULTS = 3;

export type MemoryPlace = PlaceFacts & {
  id: string;
  name: string;
  noise: string | null;
  price: string | null;
  googlePlaceId: string | null;
  lat: number | null;
  lng: number | null;
  websiteUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  ontopoUrl: string | null;
  tabitUrl: string | null;
};

/**
 * Ligne de la mémoire : un signal et son lieu, tels que lus sous RLS. `conversationId` est la
 * conversation d'origine quand le signal vient d'une réponse du réseau.
 */
export type MemoryRow = { place: MemoryPlace; signal: MemorySignal; reusable: boolean; conversationId?: string | null };

/**
 * Filtrage par cercle (CLAUDE.md § 5) : un signal compte seulement s'il vient de l'utilisateur
 * ou d'un membre de son cercle. Un signal dont la réutilisation a été refusée ne sert qu'à la
 * conversation où il a été donné. La base garantit déjà l'appartenance au cercle (RLS + trigger) ;
 * ce filtre est la deuxième ceinture.
 */
export function inCircle(
  rows: readonly MemoryRow[],
  circleMemberIds: ReadonlySet<string>,
  conversationId: string | null = null,
): MemoryRow[] {
  return rows.filter(
    (r) =>
      (r.reusable || (conversationId !== null && r.conversationId === conversationId)) &&
      (r.signal.author.kind === "self" || circleMemberIds.has(r.signal.author.id)),
  );
}

const WEIGHT: Record<EvidenceLevel, number> = {
  recommended: 5,
  visited: 3,
  booked_confirmed: 2.5,
  booked: 2,
  saved: 1,
  public: 0.5,
};

/**
 * Poids d'un signal : niveau de preuve, divisé par deux s'il est ancien, ou si le proche n'est
 * pas une référence pour ce type de lieu (domaines de confiance du cercle).
 */
export function signalWeight(signal: MemorySignal, domains: ReadonlySet<string>, now: Date): number {
  let w = WEIGHT[signal.level];
  if (isStale(signal, now)) w /= 2;
  if (signal.author.kind === "member" && domains.size > 0) {
    const trusted = signal.author.trustDomains;
    const covers = trusted.includes("all") || trusted.some((d) => domains.has(d));
    if (trusted.length > 0 && !covers) w /= 2;
  }
  return w;
}

type Candidate = { result: SearchResult; score: number; latest: number };

function placeResult(place: MemoryPlace, signals: MemorySignal[], criteria: Criteria, now: Date): Candidate {
  const distinct = distinctSignals(signals).sort(
    (a, b) => evidenceRank(a.level) - evidenceRank(b.level) || b.createdAt.getTime() - a.createdAt.getTime(),
  );
  const domains = trustDomainsFor(kindCategories(place.kind ?? criteria.placeKind));
  const vibes = matchedVibes(place, criteria);
  const inArea = areaMatches(place, criteria);
  const occasionHit =
    criteria.occasion !== null &&
    distinct.some((s) => isPersonal(s) && s.occasion.some((o) => fold(o) === fold(criteria.occasion!)));

  const score =
    distinct.reduce((sum, s) => sum + signalWeight(s, domains, now), 0) +
    (occasionHit ? 2 : 0) +
    (inArea ? 2 : 0) +
    vibes.length;

  const lines: EvidenceLine[] = distinct
    .map((s) => evidenceLine(s, now, criteria.occasion))
    .filter((l): l is EvidenceLine => l !== null);
  const deduction = deductionLine([...(inArea && criteria.area ? [criteria.area] : []), ...vibes]);
  if (deduction) lines.push(deduction);

  const people = new Map<string, Person>();
  for (const l of lines) if (l.person) people.set(l.person.id, l.person);

  const unmatched = criteria.vibe.filter((v) => !vibes.includes(v));

  return {
    score,
    latest: Math.max(...distinct.map((s) => s.createdAt.getTime())),
    result: {
      id: place.id,
      origin: "personal",
      rank: "",
      name: place.name,
      area: place.area ?? place.city,
      kind: place.kind,
      vibe: [...place.vibe],
      noise: place.noise,
      price: place.price,
      headline: null,
      lines,
      unknowns: personalUnknowns(distinct, unmatched, criteria.when, now),
      confidence: computeConfidence(distinct, now),
      people: [...people.values()],
      staleNotice: staleNotice(distinct, now),
      links: { googleMapsUrl: mapsUrl(place) },
      booking: bookingOptions(place),
    },
  };
}

/**
 * Agrège les signaux par lieu, écarte les lieux qui contredisent les critères ou qui n'ont aucun
 * signal personnel, puis classe : confiance d'abord, score ensuite, fraîcheur enfin.
 */
export function rankMemory(
  rows: readonly MemoryRow[],
  circleMemberIds: ReadonlySet<string>,
  criteria: Criteria,
  now: Date,
  limit = MAX_RESULTS,
  conversationId: string | null = null,
): SearchResult[] {
  const byPlace = new Map<string, { place: MemoryPlace; signals: MemorySignal[] }>();
  for (const row of inCircle(rows, circleMemberIds, conversationId)) {
    const entry = byPlace.get(row.place.id) ?? { place: row.place, signals: [] };
    entry.signals.push(row.signal);
    byPlace.set(row.place.id, entry);
  }

  const candidates: Candidate[] = [];
  for (const { place, signals } of byPlace.values()) {
    if (!signals.some(isPersonal)) continue;
    if (!placeMatchesCriteria(place, criteria)) continue;
    candidates.push(placeResult(place, signals, criteria, now));
  }

  candidates.sort(
    (a, b) =>
      CONFIDENCE_ORDER[a.result.confidence.level] - CONFIDENCE_ORDER[b.result.confidence.level] ||
      b.score - a.score ||
      b.latest - a.latest,
  );

  return candidates.slice(0, limit).map(({ result }, i) => ({
    ...result,
    rank: rankLabel(i, "personal"),
    headline: i === 0 ? BEST_MATCH_HEADLINE : null,
  }));
}
