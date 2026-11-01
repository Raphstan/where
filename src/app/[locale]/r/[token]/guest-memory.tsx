"use client";

import Link from "next/link";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { GuestMemory } from "@/lib/network/guest";
import { loadMyAnswers } from "./actions";

/**
 * Après « Merci » : ce que le proche a déjà recommandé au demandeur (docs/prototype.html, sarahMine),
 * puis l'invitation à garder sa mémoire en créant un compte. Toujours sans compte jusqu'au clic.
 */
export function GuestMemoryPanel({ token, requester }: { token: string; requester: string }) {
  const t = useTranslations("guest.mine");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const [memory, setMemory] = useState<GuestMemory | null | undefined>(undefined);
  const [view, setView] = useState<"offer" | "mine" | "hidden">("offer");

  useEffect(() => {
    let alive = true;
    loadMyAnswers(token).then((m) => {
      if (alive) setMemory(m);
    });
    return () => {
      alive = false;
    };
  }, [token]);

  if (memory === undefined) {
    return <p className="text-[12.5px] text-soft">{t("loading")}</p>;
  }
  if (!memory || memory.items.length === 0 || view === "hidden") return null;
  const count = memory.items.length;
  const keepHref = `/login?next=${encodeURIComponent(`/join/${token}`)}`;

  if (view === "offer") {
    return (
      <div className="flex flex-col gap-2.5 rounded-card bg-lilac-2 p-4">
        {count > 1 ? (
          <p className="text-[13.5px] leading-snug text-ink">{t.rich("timesHelped", { count, requester, b: (c) => <b className="font-bold">{c}</b> })}</p>
        ) : null}
        <button
          type="button"
          onClick={() => setView("mine")}
          className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-paper-2 px-5 text-[14px] font-bold text-ink shadow-soft"
        >
          {t("see", { count })}
        </button>
        <button type="button" onClick={() => setView("hidden")} className="self-center text-[12.5px] font-semibold text-muted hover:underline">
          {t("noThanks")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex animate-up flex-col gap-3.5">
      <div className="flex flex-col gap-1">
        <div className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{t("eyebrow", { requester })}</div>
        <h2 className="font-display text-[21px] font-bold leading-tight">{t("title")}</h2>
      </div>
      <ul className="flex flex-col divide-y divide-line rounded-card bg-paper p-1.5">
        {memory.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 px-2.5 py-2.5">
            <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${item.visited ? "bg-orange" : "bg-amber"}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-bold">{item.place}</div>
              <div className="truncate text-[12px] text-muted">
                {[item.city, item.visited ? t("visited") : t("heard")].filter(Boolean).join(" · ")}
              </div>
            </div>
            <span className="shrink-0 text-[11.5px] text-soft">{format.relativeTime(new Date(item.createdAt), now)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-start gap-2.5 rounded-[14px] bg-lilac-2 px-3.5 py-3 text-[12.5px] leading-snug text-ink-2">
        <span aria-hidden>🔒</span>
        <span>{t("privacy", { requester })}</span>
      </div>
      <div className="flex flex-col gap-2 rounded-card bg-night p-4 text-paper">
        <div className="font-display text-[19px] font-bold leading-tight">{t("askTitle")}</div>
        <p className="text-[12.5px] text-lilac">{t("askLead")}</p>
        <Link
          href={keepHref}
          className="mt-1 inline-flex min-h-[46px] items-center justify-center rounded-full bg-orange px-5 text-[14.5px] font-bold text-white shadow-orange transition-colors hover:bg-[#ee4a10]"
        >
          {t("keep")}
        </Link>
        <button type="button" onClick={() => setView("hidden")} className="self-center text-[12.5px] font-semibold text-lilac hover:underline">
          {t("notNow")}
        </button>
      </div>
    </div>
  );
}
