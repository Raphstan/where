/**
 * Lien collé dans le chat : « je veux garder ce lieu ». Fonctions pures (testées) : repérer le lien,
 * savoir d'où il vient, et lire ce qu'un lien Google Maps dit déjà du lieu.
 */

export type LinkSource = "maps" | "tiktok" | "instagram" | "web";

export type SharedLink = {
  url: string;
  source: LinkSource;
  /** Le reste du message, sans le lien (« super resto pour un date », par exemple). */
  text: string;
};

const URL_RE = /https?:\/\/[^\s<>"']+/i;

export function linkSource(url: URL): LinkSource {
  const host = url.hostname.toLowerCase();
  const path = url.pathname;
  if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
  if (/(^|\.)instagram\.com$/.test(host) || host === "instagr.am") return "instagram";
  if (
    host === "maps.app.goo.gl" ||
    /^maps\.google\.[a-z.]+$/.test(host) ||
    (host === "goo.gl" && path.startsWith("/maps")) ||
    (/^(www\.)?google\.[a-z.]+$/.test(host) && path.startsWith("/maps"))
  ) {
    return "maps";
  }
  return "web";
}

/** Hôtes Google Maps vers lesquels un lien court peut rediriger (rien d'autre n'est suivi). */
export function isGoogleHost(host: string): boolean {
  return /^(maps\.app\.goo\.gl|goo\.gl|(www\.|maps\.)?google\.[a-z.]+|consent\.google\.[a-z.]+)$/i.test(host);
}

/** Le premier lien http(s) du message, ou null : le message est alors une question ordinaire. */
export function findSharedLink(message: string): SharedLink | null {
  const match = message.match(URL_RE);
  if (!match) return null;
  // Ponctuation collée à la fin d'une phrase : « …/xyz). » → « …/xyz ».
  const raw = match[0].replace(/[).,;!?»]+$/, "");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const text = message.replace(match[0], " ").replace(/\s+/g, " ").trim();
  return { url: url.toString(), source: linkSource(url), text };
}

export type MapsHint = {
  /** Nom du lieu lu dans l'adresse (/maps/place/{nom}/…), ou la recherche (?q=…). */
  name: string | null;
  lat: number | null;
  lng: number | null;
};

function decode(part: string): string {
  try {
    return decodeURIComponent(part.replace(/\+/g, " ")).trim();
  } catch {
    return part.replace(/\+/g, " ").trim();
  }
}

/** Coordonnées plausibles, sinon null (une adresse Google peut porter des nombres sans rapport). */
function coords(lat: number, lng: number): { lat: number; lng: number } | null {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null;
}

/**
 * Ce qu'une adresse Google Maps complète dit du lieu. Les liens courts (maps.app.goo.gl) doivent
 * d'abord être suivis jusqu'à cette adresse complète (côté serveur).
 */
export function parseMapsUrl(raw: string): MapsHint {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { name: null, lat: null, lng: null };
  }
  const place = url.pathname.match(/\/maps\/place\/([^/]+)/);
  const q = url.searchParams.get("q") ?? url.searchParams.get("query");
  const nameRaw = place?.[1] ? decode(place[1]) : q ? decode(q) : null;
  // « 32.06,34.77 » n'est pas un nom.
  const name = nameRaw && !/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(nameRaw) ? nameRaw : null;

  const at = url.pathname.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  const pin = raw.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  const found = pin ? coords(Number(pin[1]), Number(pin[2])) : at ? coords(Number(at[1]), Number(at[2])) : null;
  return { name, lat: found?.lat ?? null, lng: found?.lng ?? null };
}
