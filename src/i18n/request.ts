import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { locale as rootLocale } from "next/root-params";
import { MESSAGES } from "./messages";
import { routing } from "./routing";

/*
 * La langue vient du segment racine [locale] (next/root-params), rempli par le proxy next-intl
 * à partir du cookie ou d'Accept-Language. Pas de lecture d'en-têtes ici : les pages restent
 * pré-rendables (Cache Components).
 */
export default getRequestConfig(async () => {
  const requested = await rootLocale();
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, messages: MESSAGES[locale] };
});
