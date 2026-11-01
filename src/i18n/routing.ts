import { defineRouting } from "next-intl/routing";

/**
 * Langues de WH3RE : anglais, français, hébreu (RTL).
 * Pas de préfixe dans l'URL : la langue vient du cookie, sinon du navigateur (Accept-Language).
 * Le segment interne `[locale]` sert seulement à garder les pages pré-rendables (Cache Components).
 */
export const routing = defineRouting({
  locales: ["en", "fr", "he"],
  defaultLocale: "en",
  localePrefix: "never",
  localeCookie: { name: "WH3RE_LOCALE", maxAge: 60 * 60 * 24 * 365 },
});

export type Locale = (typeof routing.locales)[number];

export const RTL_LOCALES: readonly Locale[] = ["he"];

export function isRtl(locale: string): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (routing.locales as readonly string[]).includes(value);
}
