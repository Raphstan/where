import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiLocale } from "@/i18n/request-locale";
import { getServerEnv } from "@/lib/env.server";
import { nearFromHeaders, suggestPlaces, type PlaceSuggestion } from "@/lib/google/autocomplete";
import { tokenExists } from "@/lib/network/guest";
import { consumeQuota } from "@/lib/quota";
import { findSharedLink, parseMapsUrl } from "@/lib/saves/link";
import { followMapsLink } from "@/lib/saves/read";
import { createAdminClient } from "@/lib/supabase/admin";

export type SuggestResponse = { suggestions: PlaceSuggestion[] };

const BodySchema = z.object({
  token: z.string().regex(/^[0-9a-f]{32}$/),
  q: z.string().trim().min(3).max(500),
});

const empty = () => NextResponse.json<SuggestResponse>({ suggestions: [] });

/**
 * POST /api/guest/suggest — lieux suggérés pendant la frappe, sur la page invité (sans compte).
 * Réservé aux liens privés existants, plafonné par lien et par jour, et par le budget Google du
 * mois. Toute limite atteinte donne une liste vide : le proche peut toujours taper le nom lui-même.
 * Un lien Google Maps collé est lu (nom du lieu dans l'adresse) puis cherché comme un texte.
 */
export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return empty();
  const apiKey = getServerEnv().GOOGLE_PLACES_API_KEY;
  if (!apiKey) return empty();
  const { token } = parsed.data;

  try {
    if (!(await tokenExists(token))) return empty();
    if (!(await consumeQuota(createAdminClient(), `token:${token}`, "guest_suggest"))) return empty();
  } catch {
    return empty();
  }

  let q = parsed.data.q;
  const link = findSharedLink(q);
  if (link) {
    if (link.source !== "maps") return empty();
    const full = (await followMapsLink(link.url)) ?? link.url;
    const name = parseMapsUrl(full).name;
    if (!name) return empty();
    q = name;
  }

  const locale = await apiLocale();
  const suggestions = await suggestPlaces(q, apiKey, locale, nearFromHeaders(request.headers));
  return NextResponse.json<SuggestResponse>({ suggestions });
}
