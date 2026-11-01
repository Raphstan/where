import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AddPersonButton } from "@/components/circle/add-person";
import { CircleList } from "@/components/circle/circle-list";
import { CircleNotice } from "@/components/circle/circle-notice";
import { ORANGE_BTN, H1, OnbFrame } from "@/components/home/onb-frame";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("circle");
  return { title: t("onboarding.metaTitle") };
}

/* Mon cercle de confiance, pendant l'onboarding (docs/prototype.html, scrCircleSetup(true)). */
export default function OnboardingCirclePage() {
  const t = useTranslations("circle");
  return (
    <OnbFrame back="/onboarding">
      <h1 className={H1}>{t("onboarding.title")}</h1>
      <p className="text-[15px] leading-normal text-muted">{t("lead")}</p>
      <CircleNotice />
      <Suspense fallback={<div className="h-[150px] animate-pulse rounded-card border border-line bg-paper-2" />}>
        <CircleList />
      </Suspense>
      <AddPersonButton />
      <Link href="/chat" className={ORANGE_BTN}>
        {t("onboarding.firstQuestion")}
      </Link>
      <Link href="/chat" className="self-center text-[13.5px] font-semibold text-blue hover:underline">
        {t("onboarding.skip")}
      </Link>
    </OnbFrame>
  );
}
