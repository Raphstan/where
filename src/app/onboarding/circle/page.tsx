import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AddPersonButton } from "@/components/circle/add-person";
import { CIRCLE_LEAD, CircleList } from "@/components/circle/circle-list";
import { CircleNotice } from "@/components/circle/circle-notice";
import { CORAL_BTN, H1, OnbFrame } from "@/components/home/onb-frame";

export const metadata: Metadata = { title: "Ton cercle de confiance" };

/* Mon cercle de confiance, pendant l'onboarding (docs/prototype.html, scrCircleSetup(true)). */
export default function OnboardingCirclePage() {
  return (
    <OnbFrame back="/onboarding">
      <h1 className={H1}>Ton cercle de confiance.</h1>
      <p className="text-[15px] leading-normal text-muted">{CIRCLE_LEAD}</p>
      <CircleNotice />
      <Suspense fallback={<div className="h-[150px] animate-pulse rounded-card border border-line bg-cream-2" />}>
        <CircleList />
      </Suspense>
      <AddPersonButton />
      <Link href="/chat" className={CORAL_BTN}>
        Poser ma première question
      </Link>
      <Link href="/chat" className="self-center text-[13.5px] font-semibold text-blue hover:underline">
        Passer pour l’instant
      </Link>
    </OnbFrame>
  );
}
