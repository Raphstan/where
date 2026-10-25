import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { loadProfile, recentConversations } from "@/lib/profile/store";
import { createClient } from "@/lib/supabase/server";
import { HistoryLinks } from "./history-links";
import { SidebarLinks } from "./nav-links";
import { Wordmark } from "./wordmark";

async function currentUser() {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}

async function History() {
  const auth = await currentUser();
  const items = auth ? await recentConversations(auth.supabase, auth.user.id).catch(() => []) : [];
  if (items.length === 0) {
    return <p className="px-2.5 py-2 text-[12.5px] text-soft">Tes questions apparaîtront ici.</p>;
  }
  return <HistoryLinks items={items} />;
}

async function Account() {
  const auth = await currentUser();
  const profile = auth ? await loadProfile(auth.supabase, auth.user.id).catch(() => null) : null;
  const name = profile?.name ?? "Toi";
  return (
    <>
      <span
        aria-hidden
        className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-full bg-linear-145 from-ink-2 to-ink font-display text-[13px] font-bold text-white"
      >
        {name.charAt(0).toLocaleUpperCase("fr")}
      </span>
      <div className="min-w-0">
        <div className="truncate text-[13px] font-bold">{name}</div>
        <div className="truncate text-[11.5px] text-soft">
          {profile?.city ? `${profile.city} · ` : ""}
          <Link href="/profile" className="font-semibold text-blue hover:underline">
            Profil
          </Link>
        </div>
      </div>
    </>
  );
}

/** Colonne de gauche, desktop uniquement (docs/prototype.html, .side). */
export function Sidebar() {
  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-line bg-cream px-3.5 py-[18px] lg:flex">
      <div className="px-2 pt-1 pb-4">
        <Wordmark className="text-base" />
      </div>

      <Link
        href="/chat"
        className="flex min-h-9 items-center justify-center rounded-full bg-sand-2 px-3.5 text-[13px] font-bold text-ink transition-colors hover:bg-sand"
      >
        + Nouvelle question
      </Link>

      <div className="mt-3.5 flex flex-1 flex-col gap-0.5 overflow-auto">
        <div className="px-2.5 pt-3.5 pb-1.5 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
          Historique
        </div>
        <Suspense fallback={null}>
          <History />
        </Suspense>
      </div>

      <SidebarLinks />

      <div className="mt-2.5 flex items-center gap-2.5 border-t border-line px-2 pt-2.5">
        <Suspense fallback={<div className="h-[34px]" />}>
          <Account />
        </Suspense>
      </div>
    </aside>
  );
}
