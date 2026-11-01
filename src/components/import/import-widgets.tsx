"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePanel } from "@/components/shell/panel-context";
import { formatDay, type ImportedEmail } from "@/lib/inbound/rules";

/** L'adresse de transfert, et un bouton pour la copier. */
export function CopyAddress({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("import");
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-line bg-paper px-3.5 py-2.5">
      <code className="min-w-0 grow truncate font-sans text-[14px] font-semibold text-ink">{address}</code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(address).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          });
        }}
        className="inline-flex min-h-8 shrink-0 items-center rounded-full bg-ink px-3 text-[12.5px] font-bold text-paper transition-colors hover:bg-night"
      >
        {copied ? t("copy.copiedAddress") : t("copy.copy")}
      </button>
    </div>
  );
}

/** Les emails arrivent par webhook : la page se met à jour d'elle-même tant qu'elle est ouverte. */
export function AutoRefresh({ everyMs = 10_000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, everyMs);
    return () => clearInterval(t);
  }, [router, everyMs]);
  return null;
}

/** « Voir » : la liste des livraisons écartées (maquette, feuille « Livraisons exclues »). */
export function DeliveriesButton({ deliveries, allTabit }: { deliveries: ImportedEmail[]; allTabit: boolean }) {
  const { open } = usePanel();
  const t = useTranslations("import");
  const locale = useLocale();
  return (
    <button
      type="button"
      className="ms-auto shrink-0 text-[12.5px] font-semibold text-blue hover:underline"
      onClick={() =>
        open({
          key: "deliveries",
          title: t("deliveriesSheet.title"),
          body: (
            <div className="flex flex-col gap-3">
              <p className="text-[12.5px] text-muted">
                {allTabit ? t("deliveriesSheet.textTabit") : t("deliveriesSheet.text")}
              </p>
              <div className="flex flex-col">
                {deliveries.map((d) => (
                  <div key={d.id} className="flex items-center gap-3 border-b border-line py-[11px] opacity-55 last:border-b-0">
                    <div className="min-w-0 grow line-through decoration-soft">
                      <div className="font-bold">
                        {[d.placeName ?? t("deliveriesSheet.order"), formatDay(d.reservedFor, false, locale)].filter(Boolean).join(" · ")}
                      </div>
                      <div className="text-[12.5px] text-muted">{t("deliveriesSheet.orderLine")}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ),
        })
      }
    >
      {t("deliveriesSheet.see")}
    </button>
  );
}
