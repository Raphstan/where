import "server-only";
import { z } from "zod";
import { cityFromAddress } from "@/lib/saves/candidate";
import { googleFetch } from "./budget";

/**
 * Suggestions de lieux pendant la frappe (page invité). Places API (New), Autocomplete :
 * https://developers.google.com/maps/documentation/places/web-service/place-autocomplete
 *
 * Un seul appel par suggestion affichée, sans Place Details : le nom, l'adresse courte et
 * l'identifiant Google suffisent à retrouver le lieu plus tard (SKU « Autocomplete Requests »,
 * 10 000 gratuits par mois, plafonné à 9 000 par src/lib/google/budget.ts).
 */
export const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";

export type PlaceSuggestion = {
  googlePlaceId: string;
  name: string;
  /** Adresse courte telle que Google l'affiche (« Boulevard Saint-Germain, Paris, France »). */
  address: string | null;
  city: string | null;
};

const ResponseSchema = z.object({
  suggestions: z
    .array(
      z.object({
        placePrediction: z
          .object({
            placeId: z.string().regex(/^[A-Za-z0-9_-]{10,300}$/),
            text: z.object({ text: z.string() }).optional(),
            structuredFormat: z
              .object({
                mainText: z.object({ text: z.string().min(1) }),
                secondaryText: z.object({ text: z.string() }).optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Jusqu'à 5 lieux pour ce texte. Toute erreur (clé absente, budget épuisé, réseau) donne une liste
 * vide : la saisie libre reste toujours possible.
 */
export async function suggestPlaces(
  input: string,
  apiKey: string,
  languageCode: string,
  fetchImpl: FetchLike = googleFetch,
): Promise<PlaceSuggestion[]> {
  const text = input.trim();
  if (text.length < 3) return [];
  try {
    const res = await fetchImpl(AUTOCOMPLETE_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "X-Goog-Api-Key": apiKey },
      // Lieux seulement (pas d'adresses de rue ni de villes seules) : on recommande un endroit.
      body: JSON.stringify({ input: text, languageCode, includePureServiceAreaBusinesses: false, includedPrimaryTypes: ["establishment"] }),
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const parsed = ResponseSchema.safeParse(await res.json());
    if (!parsed.success) return [];
    return (parsed.data.suggestions ?? []).flatMap(({ placePrediction: p }) => {
      if (!p) return [];
      const name = p.structuredFormat?.mainText.text ?? p.text?.text;
      if (!name) return [];
      const address = p.structuredFormat?.secondaryText?.text?.trim() || null;
      // L'adresse courte ne contient pas toujours de rue : « Paris, France » → Paris.
      const city = address ? (cityFromAddress(address) ?? (address.includes(",") ? null : address)) : null;
      return [{ googlePlaceId: p.placeId, name: name.slice(0, 120), address: address?.slice(0, 300) ?? null, city: city?.slice(0, 80) ?? null }];
    }).slice(0, 5);
  } catch {
    return [];
  }
}
