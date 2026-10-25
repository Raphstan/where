import "server-only";
import { z } from "zod";
import type { Criteria } from "@/lib/ask/schema";
import { discoveryConfidence } from "./confidence";
import { matchedVibes } from "./match";
import {
  deductionLine,
  DISCOVERY_TEXT,
  discoveryUnknowns,
  noCircleLine,
  rankLabel,
  ratingLine,
} from "./phrasing";
import type { EvidenceLine, SearchResult } from "./types";

/** Places API (New), Text Search. https://developers.google.com/maps/documentation/places/web-service/text-search */
export const PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.shortFormattedAddress",
  "places.formattedAddress",
  "places.primaryTypeDisplayName",
  "places.businessStatus",
  "places.rating",
  "places.userRatingCount",
  "places.googleMapsUri",
].join(",");

const PlaceSchema = z.object({
  id: z.string().min(1),
  displayName: z.object({ text: z.string().min(1) }),
  shortFormattedAddress: z.string().optional(),
  formattedAddress: z.string().optional(),
  primaryTypeDisplayName: z.object({ text: z.string() }).optional(),
  businessStatus: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  userRatingCount: z.number().int().nonnegative().optional(),
  googleMapsUri: z.string().url().optional(),
});

const ResponseSchema = z.object({ places: z.array(z.unknown()).optional() });

export type GooglePlace = z.infer<typeof PlaceSchema>;

/** Requête texte à partir des critères : « bar caché calme Neve Tzedek Tel Aviv ». */
export function discoveryQuery(criteria: Criteria): string | null {
  const parts = [criteria.placeKind, ...criteria.vibe, criteria.area, criteria.city]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .filter((p) => !/^(surprends-moi|les deux)$/i.test(p.trim()));
  if (!criteria.city && !criteria.area) return null; // Sans lieu, une découverte n'a pas de sens.
  if (!parts.some((p) => p === criteria.placeKind)) parts.unshift("restaurant");
  return parts.join(" ");
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Cherche des lieux publics. Toute erreur (clé absente, réseau, réponse inattendue) donne une
 * liste vide : la découverte est un complément, jamais une raison d'échouer.
 */
export async function searchGooglePlaces(
  query: string,
  apiKey: string,
  fetchImpl: FetchLike = fetch,
): Promise<GooglePlace[]> {
  try {
    const res = await fetchImpl(PLACES_SEARCH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": FIELD_MASK,
      },
      body: JSON.stringify({ textQuery: query, languageCode: "fr", pageSize: 10 }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const parsed = ResponseSchema.safeParse(await res.json());
    if (!parsed.success) return [];
    return (parsed.data.places ?? []).flatMap((p) => {
      const place = PlaceSchema.safeParse(p);
      return place.success ? [place.data] : [];
    });
  } catch {
    return [];
  }
}

/** Premier lieu ouvert qui n'est pas déjà dans les résultats personnels. */
export function pickDiscovery(
  places: readonly GooglePlace[],
  excludeGoogleIds: ReadonlySet<string>,
  excludeNames: ReadonlySet<string>,
): GooglePlace | null {
  return (
    places.find(
      (p) =>
        (p.businessStatus === undefined || p.businessStatus === "OPERATIONAL") &&
        !excludeGoogleIds.has(p.id) &&
        !excludeNames.has(p.displayName.text.toLocaleLowerCase("fr")),
    ) ?? null
  );
}

/** Carte « Découverte » : uniquement de l'information publique, jamais attribuée à personne. */
export function discoveryResult(place: GooglePlace, criteria: Criteria, index: number): SearchResult {
  const kind = place.primaryTypeDisplayName?.text ?? null;
  const facts = { city: null, area: null, address: null, kind, vibe: [] as string[] };
  const lines: EvidenceLine[] = [noCircleLine()];
  if (place.rating !== undefined) lines.push(ratingLine(place.rating, place.userRatingCount ?? null));
  const deduction = deductionLine(matchedVibes(facts, criteria));
  if (deduction) lines.push(deduction);

  return {
    id: `google:${place.id}`,
    origin: "discovery",
    rank: rankLabel(index, "discovery"),
    name: place.displayName.text,
    area: place.shortFormattedAddress ?? place.formattedAddress ?? null,
    kind,
    vibe: [],
    noise: null,
    price: null,
    headline: DISCOVERY_TEXT.headline,
    lines,
    unknowns: discoveryUnknowns(criteria.when),
    confidence: discoveryConfidence(),
    people: [],
    staleNotice: null,
    links: { googleMapsUrl: place.googleMapsUri ?? null },
  };
}
