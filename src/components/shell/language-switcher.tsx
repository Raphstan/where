"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { routing, type Locale } from "@/i18n/routing";

/** Cookie lu par le proxy next-intl (src/i18n/routing.ts, localeCookie). */
function rememberLocale(locale: Locale) {
  document.cookie = `WH3RE_LOCALE=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/**
 * Choix de la langue (EN / FR / HE), comme le lien « FR » de la landing.
 * Écrit le cookie lu par le proxy next-intl puis recharge les données de la page.
 */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const current = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, start] = useTransition();

  function choose(locale: Locale) {
    if (locale === current) return;
    rememberLocale(locale);
    start(() => router.refresh());
  }

  return (
    <div role="group" aria-label={t("language")} className={`inline-flex items-center gap-0.5 ${pending ? "opacity-60" : ""} ${className}`}>
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          lang={locale}
          onClick={() => choose(locale)}
          aria-pressed={locale === current}
          title={t(`languages.${locale}`)}
          className={`rounded-lg px-2 py-1.5 font-mono text-[12.5px] uppercase transition-colors ${
            locale === current ? "font-medium text-ink" : "text-ink-2 hover:text-ink"
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
