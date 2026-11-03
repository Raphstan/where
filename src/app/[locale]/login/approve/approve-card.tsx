"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { approveLogin } from "./actions";

type View = "ask" | "approved" | "gone";

const CTA =
  "inline-flex min-h-[46px] items-center justify-center rounded-full bg-orange px-5 text-[14.5px] font-bold text-white shadow-orange transition-colors hover:bg-[#ee4a10] disabled:opacity-60";

/**
 * Un geste explicite approuve la demande : jamais au simple chargement de la page, que les
 * antivirus de messagerie ouvrent tout seuls.
 */
export function ApproveCard({ id, secret, live }: { id: string; secret: string; live: boolean }) {
  const [view, setView] = useState<View>(live ? "ask" : "gone");
  const [pending, start] = useTransition();
  const t = useTranslations("login.approve");

  const run = (here: boolean) =>
    start(async () => {
      const result = await approveLogin({ id, secret, here });
      if (result.status === "in") window.location.assign(result.next);
      else setView(result.status);
    });

  if (view === "gone") {
    return (
      <Card title={t("expiredTitle")} lead={t("expiredLead")}>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/login" className={CTA}>
          {t("again")}
        </a>
      </Card>
    );
  }
  if (view === "approved") {
    return (
      <Card title={t("doneTitle")} lead={t("doneLead")}>
        <p className="text-[12.5px] text-muted">
          {t.rich("here", {
            link: (chunks) => (
              <button type="button" disabled={pending} onClick={() => run(true)} className="font-semibold text-blue hover:underline">
                {chunks}
              </button>
            ),
          })}
        </p>
      </Card>
    );
  }
  return (
    <Card title={t("title")} lead={t("lead")}>
      <button type="button" disabled={pending} onClick={() => run(false)} className={CTA}>
        {pending ? t("working") : t("button")}
      </button>
    </Card>
  );
}

function Card({ title, lead, children }: { title: string; lead: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[18px]" aria-live="polite">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[28px] font-bold leading-[1.12] tracking-[-0.02em]">{title}</h1>
        <p className="text-[15px] leading-normal text-muted">{lead}</p>
      </div>
      {children}
    </div>
  );
}
