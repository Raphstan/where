import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ORANGE_BTN, EYEBROW, H1, OnbFrame } from "@/components/home/onb-frame";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("how");
  return { title: t("metaTitle") };
}

/* Les trois étapes ; textes dans messages/{langue}/how.json (`steps.*`). */
const STEPS = ["memory", "ask", "answers"] as const;

/* Comment ça marche : trois étapes et la promesse, sans décor. */
export default function HowPage() {
  const t = useTranslations("how");
  return (
    <OnbFrame back="/">
      <div className={EYEBROW}>{t("eyebrow")}</div>
      <h1 className={H1}>{t("title")}</h1>
      <ol className="flex flex-col">
        {STEPS.map((step, i) => (
          <li key={step} className="flex gap-4 border-t border-line py-5 first:border-t-0 first:pt-2">
            <span className="font-display text-[22px] leading-none font-bold text-orange">{i + 1}</span>
            <div className="flex flex-col gap-1.5">
              <div className="text-[16px] leading-snug font-bold">{t(`steps.${step}.title`)}</div>
              <p className="text-[14px] leading-normal text-ink-2">{t(`steps.${step}.text`)}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-2 rounded-card bg-night px-5 py-6 text-paper">
        <div className="font-display text-[22px] leading-tight font-bold text-balance">{t("promise")}</div>
        <p className="text-[14px] leading-normal text-lilac">{t("promiseText")}</p>
      </div>
      <Link href="/onboarding" className={ORANGE_BTN}>
        {t("start")}
      </Link>
    </OnbFrame>
  );
}
