import type { Database } from "@/lib/supabase/database.types";

export type TrustDomain = Database["public"]["Enums"]["trust_domain"];

/**
 * Domaines de confiance, dans l'ordre et avec les libellés de la maquette (DOMAINS) ;
 * « Tout » s'affiche « Je lui fais confiance pour tout » sur la fiche d'une personne.
 */
export const TRUST_DOMAINS = [
  ["all", "Je lui fais confiance pour tout"],
  ["restaurants", "Restaurants"],
  ["hotels", "Hôtels"],
  ["nightlife", "Nightlife"],
  ["travel", "Voyages"],
  ["activities", "Activités"],
  ["family", "Famille"],
  ["business", "Business"],
] as const satisfies readonly (readonly [TrustDomain, string])[];

// Toute valeur de l'enum Postgres a sa chip.
type Missing = Exclude<TrustDomain, (typeof TRUST_DOMAINS)[number][0]>;
const _everyDomainHasAChip: Missing extends never ? true : never = true;
void _everyDomainHasAChip;

export const TRUST_DOMAIN_VALUES = TRUST_DOMAINS.map(([k]) => k) as [TrustDomain, ...TrustDomain[]];

/**
 * Coche ou décoche un domaine (maquette togDom) : « Tout » remplace les domaines cochés, ou se
 * décoche ; cocher un domaine précis retire « Tout ».
 */
export function toggleDomain(current: readonly TrustDomain[], domain: TrustDomain): TrustDomain[] {
  if (domain === "all") return current.includes("all") ? [] : ["all"];
  const rest = current.filter((d) => d !== "all");
  return rest.includes(domain) ? rest.filter((d) => d !== domain) : [...rest, domain];
}
