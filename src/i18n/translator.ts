import { createTranslator } from "next-intl";
import { MESSAGES } from "./messages";
import type { Locale } from "./routing";

/**
 * Traducteur passé aux modules de `src/lib` qui fabriquent du texte (formulations, messages
 * pré-rédigés…). Côté serveur : `await getTranslations("ns")` ; côté client : `useTranslations("ns")` ;
 * dans les tests et le code hors React : `translator(locale, "ns")`.
 */
export type T = (key: string, values?: Record<string, string | number | Date>) => string;

export function translator(locale: Locale, namespace: keyof (typeof MESSAGES)["fr"]): T {
  const t = createTranslator({ locale, messages: MESSAGES[locale], namespace });
  return (key, values) => t(key as never, values as never);
}
