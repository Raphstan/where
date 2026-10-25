import type { Metadata } from "next";
import { Suspense } from "react";
import { AddPersonButton } from "@/components/circle/add-person";
import { CIRCLE_LEAD, CircleList } from "@/components/circle/circle-list";
import { CircleNotice } from "@/components/circle/circle-notice";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = { title: "Mon cercle" };

/* Mon cercle (docs/prototype.html, scrCircleSetup(false)). */
export default function CirclePage() {
  return (
    <PageFrame title="Mon cercle" lead={CIRCLE_LEAD}>
      <CircleNotice />
      <Suspense fallback={<div className="h-[150px] animate-pulse rounded-card border border-line bg-cream-2" />}>
        <CircleList />
      </Suspense>
      <AddPersonButton />
    </PageFrame>
  );
}
