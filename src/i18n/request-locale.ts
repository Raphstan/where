import "server-only";
import { cookies, headers } from "next/headers";
import { routing, isLocale, type Locale } from "./routing";

/**
 * Langue d'une route API (hors segment [locale]) : cookie WH3RE_LOCALE posé par le proxy,
 * sinon Accept-Language, sinon l'anglais.
 */
export async function apiLocale(): Promise<Locale> {
  const fromCookie = (await cookies()).get("WH3RE_LOCALE")?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const accept = (await headers()).get("accept-language") ?? "";
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase().slice(0, 2);
    if (tag === "iw") return "he";
    if (isLocale(tag)) return tag;
  }
  return routing.defaultLocale;
}
