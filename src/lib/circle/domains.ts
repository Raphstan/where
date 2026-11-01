import type { Database } from "@/lib/supabase/database.types";

export type TrustDomain = Database["public"]["Enums"]["trust_domain"];

/**
 * Domaines de confiance, dans l'ordre de la maquette (DOMAINS). Libellés : messages/{langue}/circle.json,
 * `domains.{valeur}` ; en français, ceux de la maquette (« Tout » s'affiche « Je lui fais confiance pour
 * tout » sur la fiche d'une personne). Les valeurs enregistrées ne changent pas avec la langue.
 */
export const TRUST_DOMAINS = [
  "all",
  "restaurants",
  "hotels",
  "nightlife",
  "travel",
  "activities",
  "family",
  "business",
] as const satisfies readonly TrustDomain[];

// Toute valeur de l'enum Postgres a sa chip.
type Missing = Exclude<TrustDomain, (typeof TRUST_DOMAINS)[number]>;
const _everyDomainHasAChip: Missing extends never ? true : never = true;
void _everyDomainHasAChip;

export const TRUST_DOMAIN_VALUES = [...TRUST_DOMAINS] as [TrustDomain, ...TrustDomain[]];

/**
 * Coche ou décoche un domaine (maquette togDom) : « Tout » remplace les domaines cochés, ou se
 * décoche ; cocher un domaine précis retire « Tout ».
 */
export function toggleDomain(current: readonly TrustDomain[], domain: TrustDomain): TrustDomain[] {
  if (domain === "all") return current.includes("all") ? [] : ["all"];
  const rest = current.filter((d) => d !== "all");
  return rest.includes(domain) ? rest.filter((d) => d !== domain) : [...rest, domain];
}
