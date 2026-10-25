import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Criteria } from "@/lib/ask/schema";
import type { Database } from "@/lib/supabase/database.types";
import { discoveryQuery, discoveryResult, pickDiscovery, searchGooglePlaces, type FetchLike } from "./google-places";
import { afterFor, introFor } from "./phrasing";
import { MAX_RESULTS, rankMemory, type MemoryRow } from "./rank";
import type { SearchResponse } from "./types";

/** Au-delà, la mémoire est lue par pages : largement suffisant pour le MVP. */
const MEMORY_LIMIT = 1000;

const SIGNAL_COLUMNS = `
  id, evidence_level, occasion, note, reusable, created_at, source_member_id,
  place:places!inner ( id, name, address, city, area, kind, vibe, noise, price, google_place_id, lat, lng ),
  member:circle_members ( id, name, trust_domains )
`;

export class SearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SearchError";
  }
}

/**
 * Lit la mémoire de l'utilisateur (ses signaux et ceux attribués à son cercle) sous RLS.
 * Les signaux d'autres utilisateurs ne sont jamais lisibles : le cercle est unidirectionnel.
 */
export async function loadMemory(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ rows: MemoryRow[]; circleMemberIds: Set<string> }> {
  const [signals, circle] = await Promise.all([
    supabase.from("signals").select(SIGNAL_COLUMNS).eq("user_id", userId).limit(MEMORY_LIMIT),
    supabase.from("circle_members").select("id").eq("user_id", userId),
  ]);
  if (signals.error) throw new SearchError(signals.error.message);
  if (circle.error) throw new SearchError(circle.error.message);

  const rows: MemoryRow[] = signals.data.map((s) => ({
    reusable: s.reusable,
    place: {
      id: s.place.id,
      name: s.place.name,
      address: s.place.address,
      city: s.place.city,
      area: s.place.area,
      kind: s.place.kind,
      vibe: s.place.vibe,
      noise: s.place.noise,
      price: s.place.price,
      googlePlaceId: s.place.google_place_id,
      lat: s.place.lat,
      lng: s.place.lng,
    },
    signal: {
      id: s.id,
      level: s.evidence_level,
      // Un signal sans proche vient de l'utilisateur. Un proche introuvable (supprimé du cercle)
      // garde son identifiant : le filtre par cercle l'écartera.
      author:
        s.source_member_id === null
          ? { kind: "self" }
          : {
              kind: "member",
              id: s.source_member_id,
              name: s.member?.name ?? "",
              trustDomains: s.member?.trust_domains ?? [],
            },
      occasion: s.occasion,
      note: s.note,
      createdAt: new Date(s.created_at),
    },
  }));

  return { rows, circleMemberIds: new Set(circle.data.map((c) => c.id)) };
}

export type SearchDeps = {
  supabase: SupabaseClient<Database>;
  userId: string;
  googlePlacesApiKey: string | undefined;
  now?: Date;
  fetchImpl?: FetchLike;
};

/**
 * Recherche complète : mémoire classée, puis au plus une découverte Google Places pour
 * compléter quand le cercle ne fournit pas trois lieux. Trois résultats au maximum.
 */
export async function search(criteria: Criteria, deps: SearchDeps): Promise<SearchResponse> {
  const now = deps.now ?? new Date();
  const { rows, circleMemberIds } = await loadMemory(deps.supabase, deps.userId);
  const results = rankMemory(rows, circleMemberIds, criteria, now, MAX_RESULTS);

  const query = discoveryQuery(criteria);
  if (results.length < MAX_RESULTS && deps.googlePlacesApiKey && query) {
    const places = await searchGooglePlaces(query, deps.googlePlacesApiKey, deps.fetchImpl);
    const known = new Set(rows.flatMap((r) => (r.place.googlePlaceId ? [r.place.googlePlaceId] : [])));
    const names = new Set(rows.map((r) => r.place.name.toLocaleLowerCase("fr")));
    const pick = pickDiscovery(places, known, names);
    if (pick) results.push(discoveryResult(pick, criteria, results.length));
  }

  return { intro: introFor(results), results, after: afterFor(results) };
}
