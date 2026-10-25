import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Criteria } from "@/lib/ask/schema";
import type { Database } from "@/lib/supabase/database.types";
import {
  discoveryQuery,
  discoveryResult,
  isPermanentlyClosed,
  pickDiscovery,
  searchGooglePlaces,
  type FetchLike,
} from "./google-places";
import { suggestPeople, type CircleMember } from "@/lib/network/suggest";
import { loadUsagePrefs } from "@/lib/privacy/store";
import { usableForRecommendations } from "@/lib/privacy/usage";
import { afterFor, askIntroFor, BEST_MATCH_HEADLINE, introFor, isConfident, rankLabel } from "./phrasing";
import { MAX_RESULTS, rankMemory, type MemoryRow } from "./rank";
import type { SearchResponse, SearchResult } from "./types";

const CLOSED_SLACK = 2;

/**
 * Lieu fermé (maquette : « Suzana apparaît dans d’anciennes recommandations, mais semble désormais
 * fermé. Je l’ai écarté. ») : vérifié auprès de Google pour les lieux de la mémoire qui y sont reliés.
 * Le lieu reste dans la mémoire ; il sort seulement des résultats.
 */
async function withoutClosed(
  ranked: SearchResult[],
  rows: readonly MemoryRow[],
  apiKey: string | undefined,
  fetchImpl: FetchLike | undefined,
): Promise<{ open: SearchResult[]; closed: string[] }> {
  if (!apiKey) return { open: ranked, closed: [] };
  const googleId = new Map(rows.map((r) => [r.place.id, r.place.googlePlaceId]));
  const status = await Promise.all(
    ranked.map((r) => {
      const id = googleId.get(r.id);
      return id ? isPermanentlyClosed(id, apiKey, fetchImpl) : Promise.resolve(false);
    }),
  );
  return {
    open: ranked.filter((_, i) => !status[i]),
    closed: ranked.filter((_, i) => status[i]).map((r) => r.name),
  };
}

/** Au-delà, la mémoire est lue par pages : largement suffisant pour le MVP. */
const MEMORY_LIMIT = 1000;

const SIGNAL_COLUMNS = `
  id, evidence_level, occasion, note, reusable, created_at, source_member_id, source_type,
  place:places!inner ( id, name, address, city, area, kind, vibe, noise, price, google_place_id, lat, lng,
    website_url, phone, whatsapp, ontopo_url, tabit_url ),
  member:circle_members ( id, name, trust_domains ),
  reply:request_replies ( request:requests ( conversation_id ) )
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
 * Les signaux que l'utilisateur a retirés des recommandations (Confidentialité) sont écartés.
 */
export async function loadMemory(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<{ rows: MemoryRow[]; circleMemberIds: Set<string>; members: CircleMember[] }> {
  const [signals, circle, prefs] = await Promise.all([
    supabase.from("signals").select(SIGNAL_COLUMNS).eq("user_id", userId).limit(MEMORY_LIMIT),
    supabase.from("circle_members").select("id, name, trust_domains, phone").eq("user_id", userId),
    loadUsagePrefs(supabase, userId).catch((e: Error) => {
      throw new SearchError(e.message);
    }),
  ]);
  if (signals.error) throw new SearchError(signals.error.message);
  if (circle.error) throw new SearchError(circle.error.message);

  const usable = signals.data.filter((s) =>
    usableForRecommendations({ sourceType: s.source_type, fromMember: s.source_member_id !== null }, prefs),
  );
  const rows: MemoryRow[] = usable.map((s) => ({
    reusable: s.reusable,
    conversationId: s.reply?.request?.conversation_id ?? null,
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
      websiteUrl: s.place.website_url,
      phone: s.place.phone,
      whatsapp: s.place.whatsapp,
      ontopoUrl: s.place.ontopo_url,
      tabitUrl: s.place.tabit_url,
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

  const members: CircleMember[] = circle.data.map((c) => ({
    id: c.id,
    name: c.name,
    trustDomains: c.trust_domains,
    phone: c.phone,
  }));
  return { rows, circleMemberIds: new Set(members.map((m) => m.id)), members };
}

export type SearchDeps = {
  supabase: SupabaseClient<Database>;
  userId: string;
  googlePlacesApiKey: string | undefined;
  /** Conversation en cours : ses réponses non réutilisables comptent ici, et seulement ici. */
  conversationId?: string | null;
  now?: Date;
  fetchImpl?: FetchLike;
};

/**
 * Recherche complète : mémoire classée, puis au plus une découverte Google Places pour
 * compléter quand le cercle ne fournit pas trois lieux. Trois résultats au maximum.
 */
export async function search(criteria: Criteria, deps: SearchDeps): Promise<SearchResponse> {
  const now = deps.now ?? new Date();
  const { rows, circleMemberIds, members } = await loadMemory(deps.supabase, deps.userId);
  // Quelques candidats de plus : un lieu fermé est écarté sans laisser de place vide.
  const ranked = rankMemory(rows, circleMemberIds, criteria, now, MAX_RESULTS + CLOSED_SLACK, deps.conversationId ?? null);
  const { open, closed } = await withoutClosed(ranked, rows, deps.googlePlacesApiKey, deps.fetchImpl);
  const results = open.slice(0, MAX_RESULTS).map((r, i) => ({
    ...r,
    rank: rankLabel(i, "personal"),
    headline: i === 0 ? BEST_MATCH_HEADLINE : null,
  }));

  const query = discoveryQuery(criteria);
  if (results.length < MAX_RESULTS && deps.googlePlacesApiKey && query) {
    const places = await searchGooglePlaces(query, deps.googlePlacesApiKey, deps.fetchImpl);
    const known = new Set(rows.flatMap((r) => (r.place.googlePlaceId ? [r.place.googlePlaceId] : [])));
    const names = new Set(rows.map((r) => r.place.name.toLocaleLowerCase("fr")));
    const pick = pickDiscovery(places, known, names);
    if (pick) results.push(discoveryResult(pick, criteria, results.length));
  }

  const people = isConfident(results) ? [] : suggestPeople(members, rows, criteria);
  const askIntro = askIntroFor(results, people);
  const hasPersonal = results.some((r) => r.origin === "personal");
  return {
    // Sans aucun lieu du cercle, l'appel au réseau tient lieu d'introduction.
    intro: askIntro && !hasPersonal ? askIntro : introFor(results),
    results,
    after: afterFor(results),
    askIntro: askIntro && hasPersonal ? askIntro : null,
    people: askIntro ? people : [],
    closed,
  };
}
