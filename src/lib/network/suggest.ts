import type { Criteria } from "@/lib/ask/schema";
import { fold, kindCategories, looselyEqual, trustDomainsFor } from "@/lib/search/match";
import type { MemoryRow } from "@/lib/search/rank";
import type { SuggestedPerson } from "@/lib/search/types";

/** Membre du cercle, tel que la demande au réseau le manipule. */
export type CircleMember = {
  id: string;
  name: string;
  trustDomains: readonly string[];
  phone: string | null;
};

/** Proche proposé pour une demande ; `relevant` = coché par défaut, visiblement. */
export type { SuggestedPerson };

/** Domaines de confiance en clair (enum trust_domain → libellés de la maquette, en minuscules). */
export const DOMAIN_PHRASE: Record<string, string> = {
  all: "tout",
  restaurants: "les restaurants",
  hotels: "les hôtels",
  nightlife: "les bars & la nightlife",
  travel: "les voyages",
  activities: "les activités",
  family: "la famille",
  business: "le business",
};

const DOMAIN_SHORT: Record<string, string> = {
  restaurants: "restaurants",
  hotels: "hôtels",
  nightlife: "bars & nightlife",
  travel: "voyages",
  activities: "activités",
  family: "famille",
  business: "business",
};

export const SUGGEST_TEXT = {
  knowsArea: "Connaît bien la région",
  knowsOnePlace: "Connaît un lieu dans ce coin",
  trustAll: "Tu lui fais confiance pour tout",
  trustFor: (domain: string) => `Tu lui fais confiance pour ${DOMAIN_PHRASE[domain] ?? domain}`,
  lessRelevant: (domains: readonly string[]) =>
    domains.length > 0
      ? `Moins pertinent ici — ${domains.map((d) => DOMAIN_SHORT[d] ?? d).join(", ")}`
      : "Moins pertinent ici",
} as const;

/** Au plus quatre proches proposés, dont trois cochés : demander aux plus pertinents, pas à tout le monde. */
export const MAX_SUGGESTED = 4;
export const MAX_PRESELECTED = 3;

/** Sans type de lieu, un repas (« samedi midi », « déjeuner ») désigne un restaurant. */
function mealKind(criteria: Criteria): string | null {
  const text = fold([criteria.when, criteria.occasion, ...criteria.constraints].filter(Boolean).join(" "));
  return /\b(dejeuner|diner|midi|brunch|repas)\b/.test(text) ? "restaurant" : null;
}

/** Occasions qui correspondent à un domaine de confiance (« famille », « business »). */
function occasionDomains(occasion: string | null): string[] {
  if (!occasion) return [];
  const f = fold(occasion);
  if (/famille|enfant/.test(f)) return ["family"];
  if (/business|affaires|travail/.test(f)) return ["business"];
  return [];
}

/** Lieux de la mémoire attribués à ce proche dans la zone cherchée. */
function placesKnownInArea(memberId: string, rows: readonly MemoryRow[], criteria: Criteria): number {
  const where = [criteria.area, criteria.city].filter((v): v is string => Boolean(v));
  if (where.length === 0) return 0;
  const places = new Set<string>();
  for (const r of rows) {
    if (r.signal.author.kind !== "member" || r.signal.author.id !== memberId || r.signal.level === "public") continue;
    const facts = [r.place.city, r.place.area, r.place.address];
    if (where.some((w) => facts.some((f) => f !== null && looselyEqual(w, f)))) places.add(r.place.id);
  }
  return places.size;
}

/**
 * Proches à qui demander, selon leurs domaines de confiance et ce qu'ils connaissent déjà de la
 * zone. La raison ne dit jamais plus que les données : domaine coché par l'utilisateur, ou lieux
 * attribués à ce proche dans la mémoire.
 */
export function suggestPeople(
  members: readonly CircleMember[],
  rows: readonly MemoryRow[],
  criteria: Criteria,
  limit = MAX_SUGGESTED,
): SuggestedPerson[] {
  const byKind = trustDomainsFor(kindCategories(criteria.placeKind ?? mealKind(criteria)));
  const wanted = new Set([...byKind, ...occasionDomains(criteria.occasion)]);

  const scored = members.map((m) => {
    const trustsAll = m.trustDomains.includes("all");
    const matched = m.trustDomains.find((d) => wanted.has(d)) ?? null;
    const known = placesKnownInArea(m.id, rows, criteria);
    // Sans type de lieu connu, aucun domaine n'est exclu : seul ce que le proche connaît départage.
    const trusted = trustsAll || matched !== null || (byKind.size === 0 && m.trustDomains.length > 0);
    const relevant = trusted || known > 0;

    let reason: string;
    if (known >= 2) reason = SUGGEST_TEXT.knowsArea;
    else if (known === 1) reason = SUGGEST_TEXT.knowsOnePlace;
    else if (trustsAll) reason = SUGGEST_TEXT.trustAll;
    else if (matched) reason = SUGGEST_TEXT.trustFor(matched);
    else if (relevant && m.trustDomains[0]) reason = SUGGEST_TEXT.trustFor(m.trustDomains[0]);
    else reason = SUGGEST_TEXT.lessRelevant(m.trustDomains);

    const score = (known > 0 ? 2 + known : 0) + (matched ? 2 : 0) + (trustsAll ? 1 : 0);
    return { m, reason, relevant, score };
  });

  scored.sort((a, b) => Number(b.relevant) - Number(a.relevant) || b.score - a.score || a.m.name.localeCompare(b.m.name, "fr"));

  let preselected = 0;
  return scored.slice(0, limit).map(({ m, reason, relevant }) => {
    const checked = relevant && preselected < MAX_PRESELECTED;
    if (checked) preselected++;
    const name = m.name.trim();
    return { id: m.id, name, initial: name.charAt(0).toLocaleUpperCase("fr"), reason, relevant: checked };
  });
}
