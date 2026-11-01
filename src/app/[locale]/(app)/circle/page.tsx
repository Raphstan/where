import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AddPersonButton } from "@/components/circle/add-person";
import { CircleList } from "@/components/circle/circle-list";
import { CircleNotice } from "@/components/circle/circle-notice";
import { PageFrame } from "@/components/shell/page-frame";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("circle");
  return { title: t("title") };
}

/* Mon cercle (docs/prototype.html, scrCircleSetup(false)). */
export default function CirclePage() {
  const t = useTranslations("circle");
  return (
    <PageFrame title={t("title")} lead={t("lead")}>
      <CircleNotice />
      <Suspense fallback={<div className="h-[150px] animate-pulse rounded-card border border-line bg-paper-2" />}>
        <CircleList />
      </Suspense>
      <AddPersonButton />
    </PageFrame>
  );
}
