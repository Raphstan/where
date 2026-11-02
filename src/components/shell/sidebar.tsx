import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { loadProfile, recentConversations } from "@/lib/profile/store";
import { createClient } from "@/lib/supabase/server";
import { HistoryLinks } from "./history-links";
import { SidebarLinks } from "./nav-links";
import { GearIcon } from "./icons";
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
    const t = await getTranslations("shell");
    return <p className="px-2.5 py-2 text-[12.5px] text-soft">{t("historyEmpty")}</p>;
  }
  return <HistoryLinks items={items} />;
}

async function Account() {
  const auth = await currentUser();
  const profile = auth ? await loadProfile(auth.supabase, auth.user.id).catch(() => null) : null;
  const t = await getTranslations("common");
  const locale = await getLocale();
  const name = profile?.name ?? t("you");
  return (
    <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1.5 transition-colors hover:bg-lilac-2/70">
      <span
        aria-hidden
        className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-full bg-orange font-display text-[14px] font-bold text-white"
      >
        {name.charAt(0).toLocaleUpperCase(locale)}
      </span>
      <span className="min-w-0 grow">
        <span className="block truncate text-[13.5px] font-bold text-ink">{name}</span>
        <span className="block truncate text-[12px] text-soft">{profile?.city ?? t("profile")}</span>
      </span>
      <GearIcon className="size-[19px] shrink-0 text-muted" />
    </Link>
  );
}

/** Contenu de la barre latérale : menu, historique, compte. Sert au desktop et au tiroir mobile. */
export async function SidebarContent() {
  const t = await getTranslations("shell");
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-2.5 pt-1 pb-4">
        <Wordmark className="text-base" />
      </div>

      <SidebarLinks />

      <div className="mt-3 flex min-h-0 flex-1 flex-col gap-0.5 overflow-auto">
        <div className="px-2.5 pt-3 pb-1.5 text-[12.5px] font-semibold text-soft">{t("history")}</div>
        <Suspense fallback={null}>
          <History />
        </Suspense>
      </div>

      <div className="mt-2 flex items-center border-t border-line pt-2">
        <Suspense fallback={<div className="h-[46px]" />}>
          <Account />
        </Suspense>
      </div>
    </div>
  );
}

/** Colonne de gauche, desktop uniquement. */
export function Sidebar() {
  return (
    <aside className="hidden w-[260px] shrink-0 flex-col overflow-hidden border-e border-line bg-paper px-3 py-[18px] lg:flex">
      <SidebarContent />
    </aside>
  );
}
