"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { SIDE_ITEMS, isActive } from "@/lib/navigation";
import { NAV_ICONS, NewQuestionIcon } from "./icons";

/*
 * Le chemin courant n'est connu qu'à la requête pour les routes dynamiques (/chat/[id]) :
 * chaque navigation se pré-rend sans lien actif, puis s'active sous <Suspense>.
 */

const ROW = "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[14px] font-medium transition-colors";

/** Menu de la barre latérale (desktop) et du tiroir (mobile), comme Happenstance ou ChatGPT. */
export function SidebarLinks() {
  return (
    <Suspense fallback={<SidebarView pathname={null} />}>
      <ActiveSidebar />
    </Suspense>
  );
}

function ActiveSidebar() {
  return <SidebarView pathname={usePathname()} />;
}

function SidebarView({ pathname }: { pathname: string | null }) {
  const t = useTranslations("nav");
  const ts = useTranslations("shell");
  return (
    <nav aria-label={t("aria")} className="flex flex-col gap-0.5">
      <Link href="/chat" className={`${ROW} ${pathname === "/chat" ? "bg-lilac-2 text-ink" : "text-ink hover:bg-lilac-2/70"}`}>
        <NewQuestionIcon className="size-[19px] shrink-0" />
        {ts("newQuestion")}
      </Link>
      {SIDE_ITEMS.map((item) => {
        const active = pathname !== null && isActive(pathname, item.href);
        const Icon = NAV_ICONS[item.key];
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`${ROW} ${active ? "bg-lilac-2 text-ink" : "text-ink hover:bg-lilac-2/70"}`}
          >
            <Icon className="size-[19px] shrink-0" />
            {t(`side.${item.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
