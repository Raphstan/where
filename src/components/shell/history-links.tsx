"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import type { HistoryItem } from "@/lib/profile/store";

/** Historique de la barre latérale (maquette .side .hist) ; la conversation ouverte est marquée. */
export function HistoryLinks({ items }: { items: HistoryItem[] }) {
  return (
    <Suspense fallback={<HistoryView items={items} pathname={null} />}>
      <ActiveHistory items={items} />
    </Suspense>
  );
}

function ActiveHistory({ items }: { items: HistoryItem[] }) {
  return <HistoryView items={items} pathname={usePathname()} />;
}

function HistoryView({ items, pathname }: { items: HistoryItem[]; pathname: string | null }) {
  return items.map((c) => {
    const on = pathname === `/chat/${c.id}`;
    return (
      <Link
        key={c.id}
        href={`/chat/${c.id}`}
        title={c.question}
        aria-current={on ? "page" : undefined}
        className={`block w-full truncate rounded-[10px] px-2.5 py-2 text-[12.5px] transition-colors hover:bg-sand-2 hover:text-ink ${
          on ? "bg-sand-2 text-ink" : "text-muted"
        }`}
      >
        {c.question}
      </Link>
    );
  });
}
