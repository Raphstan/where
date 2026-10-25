import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { PageFrame } from "@/components/shell/page-frame";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profil" };

async function Account() {
  // Rendu à la requête : la session vit dans les cookies, jamais dans le pré-rendu.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="rounded-card border border-line bg-cream-2 p-4 shadow-soft">
      <div className="mb-2 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Compte</div>
      <div className="flex items-center justify-between gap-3 py-[11px] text-[13.5px]">
        <span className="text-muted">Email</span>
        <span className="truncate">{user?.email ?? "—"}</span>
      </div>
      <form action="/auth/signout" method="post" className="mt-2">
        <button
          type="submit"
          className="inline-flex min-h-9 w-full items-center justify-center rounded-full border-[1.5px] border-line px-3.5 text-[13px] font-bold text-ink transition-colors hover:border-ink"
        >
          Se déconnecter
        </button>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <PageFrame title="Profil" lead="Tes préférences apprises, tes sources et ta confidentialité.">
      <div className="rounded-card border border-line bg-cream-2 p-4 shadow-soft">
        <div className="mb-2 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
          Mes préférences apprises
        </div>
        <p className="text-[12.5px] text-muted">
          WHERE n&apos;a encore rien appris. Tes préférences apparaîtront ici au fil de tes questions.
        </p>
      </div>
      <Link
        href="/import"
        className="flex items-center gap-3.5 rounded-card border border-line bg-cream-2 p-4 shadow-soft transition hover:-translate-y-px hover:border-ink"
      >
        <span aria-hidden className="text-[20px]">
          📬
        </span>
        <span className="grow">
          <span className="block font-bold">Retrouver mes anciennes réservations</span>
          <span className="block text-[12.5px] text-muted">Par transfert d’email. Tu valides avant tout ajout.</span>
        </span>
        <span aria-hidden className="text-soft">
          ›
        </span>
      </Link>
      <Suspense
        fallback={
          <div className="h-[118px] animate-pulse rounded-card border border-line bg-cream-2" />
        }
      >
        <Account />
      </Suspense>
    </PageFrame>
  );
}
