import type { Criteria } from "@/lib/ask/schema";

/** Minuscules, sans accents ni apostrophes typographiques, espaces simples. */
export function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’'`-]/g, " ")
    .toLocaleLowerCase("fr")
    .replace(/\s+/g, " ")
    .trim();
}

/** Deux libellés désignent la même chose si l'un contient l'autre (« Tel Aviv » ⊂ « Tel Aviv-Yafo »). */
export function looselyEqual(a: string, b: string): boolean {
  const fa = fold(a);
  const fb = fold(b);
  return fa.length > 0 && fb.length > 0 && (fa.includes(fb) || fb.includes(fa));
}

export type KindCategory = "restaurant" | "bar" | "cafe" | "hotel" | "beach" | "activity";

const KIND_WORDS: Record<KindCategory, readonly string[]> = {
  restaurant: ["restaurant", "bistrot", "bistro", "brasserie", "trattoria", "table", "cantine", "dejeuner", "diner", "winery"],
  bar: ["bar", "cocktail", "pub", "cave a vin", "bar a vin", "nightlife", "club"],
  cafe: ["cafe", "coffee", "boulangerie", "bakery", "salon de the", "brunch"],
  hotel: ["hotel", "auberge", "b&b", "chambre d hote", "sejour", "hebergement"],
  beach: ["plage", "beach"],
  activity: ["activite", "musee", "kayak", "spa", "concert", "degustation", "visite", "parc", "exposition"],
};

/** Catégories reconnues dans un libellé libre : « Bar-restaurant » → {bar, restaurant}. */
export function kindCategories(label: string | null): Set<KindCategory> {
  const out = new Set<KindCategory>();
  if (!label) return out;
  const f = ` ${fold(label)} `;
  if (/\bles deux\b/.test(f)) return new Set(["restaurant", "bar"]);
  for (const [category, words] of Object.entries(KIND_WORDS) as [KindCategory, readonly string[]][]) {
    if (words.some((w) => f.includes(` ${w}`))) out.add(category);
  }
  return out;
}

/** Domaine de confiance du cercle correspondant à un type de lieu (enum Postgres trust_domain). */
export function trustDomainsFor(categories: ReadonlySet<KindCategory>): Set<string> {
  const out = new Set<string>();
  for (const c of categories) {
    if (c === "restaurant" || c === "cafe") out.add("restaurants");
    if (c === "bar") out.add("nightlife");
    if (c === "hotel") out.add("hotels");
    if (c === "beach" || c === "activity") out.add("activities");
  }
  return out;
}

export type PlaceFacts = {
  city: string | null;
  area: string | null;
  address: string | null;
  kind: string | null;
  vibe: readonly string[];
};

/**
 * Filtres stricts : un lieu est écarté seulement quand le critère et l'attribut sont tous deux
 * connus et se contredisent. Une donnée manquante n'exclut jamais.
 */
export function placeMatchesCriteria(place: PlaceFacts, criteria: Criteria): boolean {
  if (criteria.city && place.city && !looselyEqual(criteria.city, place.city)) {
    // La ville cherchée peut être nommée par le quartier ou l'adresse (« Jaffa » pour Tel Aviv).
    const elsewhere = [place.area, place.address].some((v) => v && looselyEqual(criteria.city!, v));
    if (!elsewhere) return false;
  }
  const wanted = kindCategories(criteria.placeKind);
  const offered = kindCategories(place.kind);
  if (wanted.size > 0 && offered.size > 0 && ![...wanted].some((c) => offered.has(c))) return false;
  return true;
}

/** Le quartier demandé correspond-il au lieu ? */
export function areaMatches(place: PlaceFacts, criteria: Criteria): boolean {
  if (!criteria.area) return false;
  return [place.area, place.address].some((v) => v !== null && looselyEqual(criteria.area!, v));
}

/** Ambiances demandées retrouvées dans l'ambiance du lieu. */
export function matchedVibes(place: PlaceFacts, criteria: Criteria): string[] {
  return criteria.vibe.filter((v) => place.vibe.some((pv) => looselyEqual(v, pv)));
}

/**
 * Retire un critère après un clic sur sa chip : chaque champ dont la valeur correspond à la chip
 * est vidé. « près de Tel Aviv » retire la ville « Tel Aviv ».
 */
export function withoutTag(criteria: Criteria, tag: string): Criteria {
  const hit = (v: string | null) => v !== null && looselyEqual(v, tag);
  const partyHit =
    criteria.partySize !== null && /\b(personnes?|enfants?|deux|trois|quatre|\d+)\b/.test(fold(tag));
  return {
    city: hit(criteria.city) ? null : criteria.city,
    area: hit(criteria.area) ? null : criteria.area,
    when: hit(criteria.when) ? null : criteria.when,
    partySize: partyHit ? null : criteria.partySize,
    occasion: hit(criteria.occasion) ? null : criteria.occasion,
    placeKind: hit(criteria.placeKind) ? null : criteria.placeKind,
    vibe: criteria.vibe.filter((v) => !looselyEqual(v, tag)),
    constraints: criteria.constraints.filter((v) => !looselyEqual(v, tag)),
  };
}

/** Ajoute un critère libre (« + ajouter ») : il compte comme une ambiance souhaitée. */
export function withTag(criteria: Criteria, tag: string): Criteria {
  if (criteria.vibe.some((v) => looselyEqual(v, tag))) return criteria;
  return { ...criteria, vibe: [...criteria.vibe, tag] };
}
