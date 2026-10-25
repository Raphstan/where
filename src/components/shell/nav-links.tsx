"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { NAV_ITEMS, isActive } from "@/lib/navigation";
import { NAV_ICONS } from "./icons";

/*
 * Le chemin courant n'est connu qu'à la requête pour les routes dynamiques (/chat/[id]) :
 * chaque navigation se pré-rend sans onglet actif, puis s'active sous <Suspense>.
 */

/** Onglets du bas, mobile uniquement (docs/prototype.html, renderTabs). */
export function MobileTabs() {
  return (
    <Suspense fallback={<TabsView pathname={null} />}>
      <ActiveTabs />
    </Suspense>
  );
}

function ActiveTabs() {
  return <TabsView pathname={usePathname()} />;
}

function TabsView({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="flex justify-around border-t border-line bg-cream px-2.5 pt-2 pb-[max(22px,env(safe-area-inset-bottom))] lg:hidden"
    >
      {NAV_ITEMS.map((item) => {
        if (!item.tabLabel) return null;
        const Icon = NAV_ICONS[item.key];
        const active = pathname !== null && isActive(pathname, item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-w-16 flex-col items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold transition-colors ${
              active ? "text-ink" : "text-soft hover:text-ink-2"
            }`}
          >
            <Icon className="size-[22px]" />
            {item.tabLabel}
          </Link>
        );
      })}
    </nav>
  );
}

/** Liens de la barre latérale desktop (docs/prototype.html, renderSide). */
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
  return (
    <nav aria-label="Navigation principale" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const Icon = NAV_ICONS[item.key];
        const active = pathname !== null && isActive(pathname, item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-[9px] text-[13.5px] font-semibold transition-colors ${
              active ? "bg-ink text-cream" : "text-ink-2 hover:bg-sand-2"
            }`}
          >
            <Icon className="size-[18px] shrink-0" />
            {item.sideLabel}
          </Link>
        );
      })}
    </nav>
  );
}
