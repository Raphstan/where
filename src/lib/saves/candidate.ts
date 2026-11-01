import { z } from "zod";
import type { PlaceKind } from "./extract";

/** Lieu proposé à l'utilisateur avant de le garder (« J'ai trouvé X. Je le garde ? »). */
export const SaveCandidateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  city: z.string().trim().max(120).nullable(),
  area: z.string().trim().max(120).nullable(),
  /** Type en clair, stocké en français comme le reste de la mémoire (« Restaurant », « Bar »…). */
  kind: z.string().trim().max(80).nullable(),
  address: z.string().trim().max(300).nullable(),
  googlePlaceId: z.string().trim().max(300).nullable(),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  /** Les mots de l'utilisateur autour du lien, gardés comme note. */
  note: z.string().trim().max(500).nullable(),
});

export type SaveCandidate = z.infer<typeof SaveCandidateSchema>;

export const KIND_LABEL: Record<PlaceKind, string | null> = {
  restaurant: "Restaurant",
  bar: "Bar",
  cafe: "Café",
  hotel: "Hôtel",
  activity: "Activité",
  other: null,
};

/**
 * Ville d'une adresse Google formatée (« Ha-Yarkon St 1, Tel Aviv-Yafo, Israel » → « Tel Aviv-Yafo ») :
 * l'avant-dernier élément, sans code postal.
 */
export function cityFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const city = parts[parts.length - 2]!.replace(/\b\d[\d\s-]*\b/g, "").replace(/\s+/g, " ").trim();
  return city.length > 0 ? city : null;
}
