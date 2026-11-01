import "server-only";
import { searchGooglePlaces } from "@/lib/search/google-places";
import { KIND_LABEL, cityFromAddress, type SaveCandidate } from "./candidate";
import { extractPlace, type ExtractedPlace } from "./extract";
import type { AskClient } from "@/lib/ask/understand";
import { parseMapsUrl, type SharedLink } from "./link";
import { followMapsLink, readTikTok, type FetchLike } from "./read";

export type ResolveDeps = {
  googlePlacesApiKey: string | undefined;
  fetchImpl?: FetchLike;
  client?: AskClient;
};

/** Type stocké (en français) à partir du type Google, demandé en anglais. */
function kindFromGoogle(type: string | undefined): string | null {
  if (!type) return null;
  if (/hotel|hostel|lodging|guest house|resort/i.test(type)) return "Hôtel";
  if (/bar|pub|wine|cocktail|night ?club|brewery/i.test(type)) return "Bar";
  if (/caf[eé]|coffee|bakery|tea house/i.test(type)) return "Café";
  if (/restaurant|bistro|brasserie|diner|eatery|pizzeria|steak|sushi/i.test(type)) return "Restaurant";
  if (/museum|gallery|park|tour|spa|attraction|theater|theatre|beach/i.test(type)) return "Activité";
  return null;
}

async function identify(link: SharedLink, deps: ResolveDeps): Promise<{ place: ExtractedPlace; lat: number | null; lng: number | null } | null> {
  if (link.source === "maps") {
    const full = (await followMapsLink(link.url, deps.fetchImpl)) ?? link.url;
    const hint = parseMapsUrl(full);
    // Avec la clé Google, le nom lu dans l'adresse suffit : Google Places donnera la ville et le type.
    if (hint.name && deps.googlePlacesApiKey) {
      return { place: { name: hint.name, city: null, area: null, kind: null }, lat: hint.lat, lng: hint.lng };
    }
    // Sans elle, Claude déduit la ville et le type du nom et des coordonnées.
    const content = [hint.name ? `Nom du lieu : ${hint.name}` : null, hint.lat !== null ? `Coordonnées : ${hint.lat}, ${hint.lng}` : null]
      .filter(Boolean)
      .join("\n");
    const place = await extractPlace({ source: "Google Maps", url: full, content: content || null, note: link.text }, deps.client);
    return place ? { place, lat: hint.lat, lng: hint.lng } : null;
  }
  // Instagram et les autres sites ne sont pas lus : seuls l'adresse et les mots de l'utilisateur comptent.
  const content = link.source === "tiktok" ? await readTikTok(link.url, deps.fetchImpl) : null;
  const label = { tiktok: "TikTok", instagram: "Instagram", web: "site web" }[link.source];
  const place = await extractPlace({ source: label, url: link.url, content, note: link.text }, deps.client);
  return place ? { place, lat: null, lng: null } : null;
}

/**
 * Lien partagé → lieu à proposer, ou null si aucun lieu précis n'en ressort. Google Places, quand la
 * clé existe, confirme le lieu (nom exact, adresse, identifiant) ; sinon on garde ce qui a été lu.
 */
export async function resolveLink(link: SharedLink, deps: ResolveDeps): Promise<SaveCandidate | null> {
  const found = await identify(link, deps);
  if (!found) return null;
  const { place } = found;
  const note = link.text.length > 0 ? link.text.slice(0, 500) : null;

  if (deps.googlePlacesApiKey) {
    const query = [place.name, place.area, place.city].filter(Boolean).join(" ");
    const [best] = await searchGooglePlaces(query, deps.googlePlacesApiKey, deps.fetchImpl, "en");
    if (best) {
      const address = best.formattedAddress ?? best.shortFormattedAddress ?? null;
      return {
        name: best.displayName.text,
        city: place.city ?? cityFromAddress(best.formattedAddress),
        area: place.area,
        kind: (place.kind ? KIND_LABEL[place.kind] : null) ?? kindFromGoogle(best.primaryTypeDisplayName?.text),
        address,
        googlePlaceId: best.id,
        lat: found.lat,
        lng: found.lng,
        note,
      };
    }
  }
  return {
    name: place.name,
    city: place.city,
    area: place.area,
    kind: place.kind ? KIND_LABEL[place.kind] : null,
    address: null,
    googlePlaceId: null,
    lat: found.lat,
    lng: found.lng,
    note,
  };
}
