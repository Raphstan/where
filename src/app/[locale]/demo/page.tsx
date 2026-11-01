import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { Notice, UserBubble, WhereBubble } from "@/components/chat/bubbles";
import { ORANGE_BTN, EYEBROW, OnbFrame } from "@/components/home/onb-frame";
import { ResultCard } from "@/components/results/result-card";
import type { Locale } from "@/i18n/routing";
import { translator } from "@/i18n/translator";
import { DEMO_CRITERIA, demoMemory, localizeDemoResult } from "@/lib/demo/memory";
import { search } from "@/lib/search/search";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding.demoPage");
  return { title: t("metaTitle") };
}

/** La vraie recherche, sur la mémoire de démonstration : aucune lecture ni écriture en base. */
async function DemoAnswer() {
  await connection(); // « maintenant » : l'âge des recommandations dépend de la date du jour.
  const locale = (await getLocale()) as Locale;
  const response = await search(DEMO_CRITERIA, {
    tr: { t: translator(locale, "search"), ev: translator(locale, "evidence") },
    network: translator(locale, "network"),
    locale,
    memory: demoMemory(new Date(), locale),
    googlePlacesApiKey: undefined,
  });
  return (
    <>
      <WhereBubble>
        {response.intro.map((p, i) => (p.strong ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>))}
      </WhereBubble>
      {response.results.map((r, i) => (
        <ResultCard key={r.id} result={localizeDemoResult(r, locale)} first={i === 0} />
      ))}
      {response.after ? <Notice tone="info">{response.after}</Notice> : null}
    </>
  );
}

/* « Explorer une démonstration » (docs/prototype.html, onb) : une vraie réponse, sur des données d'exemple. */
export default async function DemoPage() {
  const [t, th] = await Promise.all([getTranslations("onboarding.demoPage"), getTranslations("home")]);
  const chips = t("chips").split("|");
  return (
    <OnbFrame back="/onboarding">
      <div className={EYEBROW}>{t("eyebrow")}</div>
      <p className="text-[13.5px] leading-snug text-muted">{t("lead")}</p>
      <UserBubble>{th("examples.date")}</UserBubble>
      <div className="flex flex-col gap-1.5">
        <div className="text-[12px] text-soft">{t("understood")}</div>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="rounded-full bg-blue-2 px-3 py-1.5 text-[12.5px] font-semibold text-blue">
              {c}
            </span>
          ))}
        </div>
      </div>
      <Suspense fallback={<div className="h-[420px] animate-pulse rounded-card bg-paper-2" />}>
        <DemoAnswer />
      </Suspense>
      <div className="flex flex-col gap-2 rounded-card bg-night p-4 text-paper">
        <div className="font-display text-[19px] font-bold leading-tight">{t("ctaTitle")}</div>
        <p className="text-[12.5px] text-lilac">{t("ctaLead")}</p>
        <Link href="/onboarding" className={`${ORANGE_BTN} mt-1`}>
          {t("cta")}
        </Link>
      </div>
    </OnbFrame>
  );
}
