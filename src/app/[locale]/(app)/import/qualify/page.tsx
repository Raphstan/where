import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { QualifyDeck } from "@/components/import/qualify-deck";
import { formatDay, provenanceLabel } from "@/lib/inbound/rules";
import { pendingReservations } from "@/lib/inbound/store";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("import");
  return { title: t("qualify.eyebrow") };
}

async function Deck() {
  await connection();
  const supabase = await createClient();
  const reservations = await pendingReservations(supabase);
  const t = await getTranslations("import");
  const locale = await getLocale();

  if (reservations.length === 0) {
    return (
      <div className="flex flex-col gap-3 pt-10">
        <div className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{t("qualify.eyebrow")}</div>
        <p className="text-[15px] leading-normal text-muted">
          {t("qualify.empty")}
        </p>
        <Link href="/import" className="text-[13px] font-semibold text-blue hover:underline">
          {t("qualify.backToImport")}
        </Link>
      </div>
    );
  }

  return (
    <QualifyDeck
      cards={reservations.map((r) => ({
        id: r.id,
        placeName: r.placeName,
        city: r.city,
        provenance: [provenanceLabel(t, r.kind, r.platform), formatDay(r.reservedFor, false, locale)].filter(Boolean).join(" · "),
      }))}
    />
  );
}

/* Qualifier mes expériences (docs/prototype.html, scrQualify). */
export default function QualifyPage() {
  return (
    <div className="px-[22px] pt-3 pb-7 lg:px-9 lg:pt-7">
      <div className="mx-auto w-full max-w-[460px]">
        <Suspense fallback={<div className="h-[520px] animate-pulse rounded-card-lg bg-paper-2" />}>
          <Deck />
        </Suspense>
      </div>
    </div>
  );
}
