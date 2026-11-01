import "server-only";
import { z } from "zod";
import { isGoogleHost } from "./link";

/**
 * Lecture d'un lien partagé, côté serveur. Seuls deux services sont appelés, par leurs accès publics :
 * Google Maps (redirections des liens courts) et l'oEmbed officiel de TikTok. Instagram n'ouvre ses
 * publications qu'aux comptes connectés : on ne contourne pas cette protection, l'utilisateur ajoute
 * le nom du lieu à côté du lien. Aucun autre site n'est téléchargé. Toute erreur donne null.
 */

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

const TIMEOUT_MS = 5000;

/** Suit un lien court Google Maps jusqu'à l'adresse complète, sans jamais quitter Google. */
export async function followMapsLink(raw: string, fetchImpl: FetchLike = fetch): Promise<string | null> {
  let current = raw;
  for (let hop = 0; hop < 6; hop++) {
    let url: URL;
    try {
      url = new URL(current);
    } catch {
      return null;
    }
    if (url.protocol !== "https:" || !isGoogleHost(url.hostname)) return null;
    // Page de consentement (Europe) : l'adresse visée est dans « continue ».
    if (url.hostname.startsWith("consent.")) {
      const next = url.searchParams.get("continue");
      if (!next) return null;
      current = next;
      continue;
    }
    if (url.pathname.startsWith("/maps") && url.hostname !== "maps.app.goo.gl" && url.hostname !== "goo.gl") return url.toString();
    try {
      const res = await fetchImpl(url.toString(), { method: "GET", redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
      const location = res.headers.get("location");
      if (!location) return url.hostname.startsWith("maps.") || url.pathname.startsWith("/maps") ? url.toString() : null;
      current = new URL(location, url).toString();
    } catch {
      return null;
    }
  }
  return null;
}

const OEmbedSchema = z.object({ title: z.string().optional(), author_name: z.string().optional() });

/** Légende et auteur d'une vidéo TikTok publique (oEmbed, sans clé). */
export async function readTikTok(url: string, fetchImpl: FetchLike = fetch): Promise<string | null> {
  try {
    const res = await fetchImpl(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, {
      method: "GET",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const parsed = OEmbedSchema.safeParse(await res.json());
    if (!parsed.success || !parsed.data.title) return null;
    return [parsed.data.author_name ? `@${parsed.data.author_name}` : null, parsed.data.title].filter(Boolean).join(" : ");
  } catch {
    return null;
  }
}
