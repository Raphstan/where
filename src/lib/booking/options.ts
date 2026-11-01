import type { T } from "@/i18n/translator";

/**
 * Moyens de réserver ou de joindre un lieu (docs/prototype.html, BOOK et bookBody).
 * WH3RE ne réserve pas : ce sont des liens sortants, et seulement ceux qui existent vraiment pour
 * ce lieu. Aucune intégration avec Ontopo ou Tabit (CLAUDE.md § 5) : un lien n'apparaît que si son
 * URL est connue.
 */

/** Ordre d'affichage de la maquette : plateformes d'abord, puis site, téléphone, WhatsApp, carte. */
export const BOOKING_KINDS = ["ontopo", "tabit", "site", "tel", "wa", "maps"] as const;

export type BookingKind = (typeof BOOKING_KINDS)[number];

/**
 * Libellé d'un moyen, mot pour mot en français (maquette BOOK) : messages/{langue}/booking.json,
 * `labels.{kind}`. Le libellé n'est pas stocké dans l'option : il suit la langue de l'affichage.
 * `t` : traducteur de l'espace `booking`.
 */
export function bookingLabel(t: T, kind: BookingKind): string {
  return t(`labels.${kind}`);
}

export type BookingOption = { kind: BookingKind; url: string };

/** Ce que l'on sait d'un lieu pour construire ses liens sortants. */
export type BookingPlace = {
  name: string;
  address: string | null;
  city: string | null;
  googlePlaceId: string | null;
  /** Lien Google Maps déjà fourni (Google Places), prioritaire. */
  googleMapsUrl?: string | null;
  websiteUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  ontopoUrl: string | null;
  tabitUrl: string | null;
};

/*
 * Textes de la feuille « Réserver » (maquette bookBody) : messages/{langue}/booking.json
 * (`intro`, `notes.tabit`, `notes.noPlatform`, `leaving.*`).
 */

function httpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Numéro composable : chiffres et « + » initial, au moins 6 chiffres. */
export function telUrl(phone: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6) return null;
  return `tel:${trimmed.startsWith("+") ? "+" : ""}${digits}`;
}

/**
 * Lien wa.me. WhatsApp exige un numéro international : un numéro local (« 050… ») ne permet pas
 * de deviner le pays, on n'affiche donc pas l'option plutôt que d'inventer un indicatif.
 */
export function waUrl(phone: string | null): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  const international = trimmed.startsWith("+") || trimmed.startsWith("00");
  const digits = trimmed.replace(/\D/g, "").replace(/^00/, "");
  if (!international || digits.length < 8) return null;
  return `https://wa.me/${digits}`;
}

/**
 * Lien Google Maps (URL universelle « Maps URLs »). Avec un place_id, le lieu exact ; sinon une
 * recherche par nom et adresse ou ville. Sans aucune localisation, pas de lien.
 */
export function mapsUrl(place: Pick<BookingPlace, "name" | "address" | "city" | "googlePlaceId" | "googleMapsUrl">): string | null {
  const given = httpUrl(place.googleMapsUrl);
  if (given) return given;
  const where = place.address ?? place.city;
  if (!place.googlePlaceId && !where) return null;
  const params = new URLSearchParams({ api: "1", query: [place.name, where].filter(Boolean).join(", ") });
  if (place.googlePlaceId) params.set("query_place_id", place.googlePlaceId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/** Les seuls moyens réellement disponibles pour ce lieu, dans l'ordre de la maquette. */
export function bookingOptions(place: BookingPlace): BookingOption[] {
  const urls: Record<BookingKind, string | null> = {
    ontopo: httpUrl(place.ontopoUrl),
    tabit: httpUrl(place.tabitUrl),
    site: httpUrl(place.websiteUrl),
    tel: telUrl(place.phone),
    wa: waUrl(place.whatsapp),
    maps: mapsUrl(place),
  };
  return BOOKING_KINDS.flatMap((kind) => {
    const url = urls[kind];
    return url ? [{ kind, url }] : [];
  });
}

/**
 * Notes sous la liste (maquette bookBody) : Tabit et livraisons, ou ni Ontopo ni Tabit.
 * `t` : traducteur de l'espace `booking`.
 */
export function bookingNotes(t: T, options: readonly BookingOption[]): string[] {
  const kinds = new Set(options.map((o) => o.kind));
  const notes: string[] = [];
  if (kinds.has("tabit")) notes.push(t("notes.tabit"));
  if (!kinds.has("ontopo") && !kinds.has("tabit")) notes.push(t("notes.noPlatform"));
  return notes;
}

/**
 * Écran « Tu quittes WH3RE » (maquette renderLeave) : « Tu quittes WH3RE pour finaliser ta
 * réservation sur {Plateforme}. » La maquette dérive la plateforme du libellé, ce qui donnerait
 * « sur site du restaurant » ou « sur Appeler » : on garde la phrase, avec l’article et « par téléphone ».
 * Une phrase entière par moyen (`leaving.text.{kind}`). `t` : traducteur de l'espace `booking`.
 */
export function leavingText(t: T, kind: BookingKind): string {
  return t(`leaving.text.${kind}`);
}
