import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { QualifyDeck } from "@/components/import/qualify-deck";
import { formatDay, provenanceLabel, QUALIFY_TEXT } from "@/lib/inbound/rules";
import { pendingReservations } from "@/lib/inbound/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: QUALIFY_TEXT.eyebrow };

async function Deck() {
  await connection();
  const supabase = await createClient();
  const reservations = await pendingReservations(supabase);

  if (reservations.length === 0) {
    return (
      <div className="flex flex-col gap-3 pt-10">
        <div className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">{QUALIFY_TEXT.eyebrow}</div>
        <p className="text-[15px] leading-normal text-muted">
          Rien à qualifier pour l’instant. Transfère une confirmation de réservation : elle apparaîtra ici.
        </p>
        <Link href="/import" className="text-[13px] font-semibold text-blue hover:underline">
          ‹ Retour à l’import
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
        provenance: [provenanceLabel(r.kind, r.platform), formatDay(r.reservedFor, false)].filter(Boolean).join(" · "),
      }))}
    />
  );
}

/* Qualifier mes expériences (docs/prototype.html, scrQualify). */
export default function QualifyPage() {
  return (
    <div className="px-[22px] pt-3 pb-7 lg:px-9 lg:pt-7">
      <div className="mx-auto w-full max-w-[460px]">
        <Suspense fallback={<div className="h-[520px] animate-pulse rounded-card-lg bg-cream-2" />}>
          <Deck />
        </Suspense>
      </div>
    </div>
  );
}
