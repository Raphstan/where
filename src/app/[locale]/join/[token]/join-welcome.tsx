"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toggleDomain, TRUST_DOMAINS, type TrustDomain } from "@/lib/circle/domains";
import { addRequesterToCircle, claimMemory } from "./actions";

type Claim = Awaited<ReturnType<typeof claimMemory>>;

/**
 * Rangement de la mémoire du proche (une fois, au premier affichage), puis proposition d'ajouter le
 * demandeur à son cercle : rien n'est ajouté sans son clic.
 */
export function JoinWelcome({ token }: { token: string }) {
  const t = useTranslations("guest.join");
  const tc = useTranslations("circle");
  const [claim, setClaim] = useState<Claim | null>(null);
  const [domains, setDomains] = useState<TrustDomain[]>([]);
  const [step, setStep] = useState<"propose" | "added" | "skipped">("propose");
  const [addError, setAddError] = useState(false);
  const [pending, start] = useTransition();

  // Une seule demande, même quand React rejoue l'effet (mode strict en développement).
  const asked = useRef<Promise<Claim> | null>(null);
  useEffect(() => {
    asked.current ??= claimMemory(token);
    asked.current.then(setClaim);
  }, [token]);

  if (!claim) return <p className="py-10 text-center text-[13.5px] text-muted">{t("loading")}</p>;

  if (!claim.ok) {
    return (
      <div className="flex flex-col gap-3 py-4">
        <p className="rounded-[14px] bg-amber-2 px-3.5 py-3 text-[13.5px] text-[#6e4f14]">{t(`errors.${claim.reason}`)}</p>
        <Link href="/chat" className="self-start text-[13.5px] font-semibold text-blue hover:underline">
          {t("toChat")}
        </Link>
      </div>
    );
  }

  const requester = claim.requesterName ?? t("requesterFallback");
  const initial = claim.memberName.charAt(0).toLocaleUpperCase();

  return (
    <div className="flex animate-up flex-col items-center gap-3.5 text-center">
      <span
        aria-hidden
        className="inline-flex size-[64px] items-center justify-center rounded-full bg-linear-145 from-[#ff8a5c] to-[#e04a12] font-display text-[26px] font-bold text-white"
      >
        {initial}
      </span>
      <h1 className="font-display text-[28px] font-extrabold leading-tight">{t("welcome", { name: claim.memberName })}</h1>
      <p className="text-[14px] text-muted">{t("count", { count: claim.count })}</p>

      {!claim.requesterInCircle && step === "propose" ? (
        <div className="flex w-full flex-col gap-3 rounded-card bg-paper p-4 text-start">
          <div className="font-display text-[18px] font-bold leading-tight">{t("addTitle", { requester })}</div>
          <p className="text-[12.5px] text-muted">{t("addLead")}</p>
          <div className="flex flex-wrap gap-1.5">
            {TRUST_DOMAINS.map((d) => {
              const on = domains.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDomains((cur) => toggleDomain(cur, d))}
                  className={`rounded-full border-[1.5px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    on ? "border-ink bg-ink text-paper" : "border-line bg-paper-2 text-ink hover:border-ink"
                  }`}
                >
                  {tc(`domains.${d}`)}
                </button>
              );
            })}
          </div>
          {addError ? <p className="text-[12.5px] text-orange-ink">{t("errors.addFailed")}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await addRequesterToCircle({ token, domains, fallbackName: requester });
                  if (r.ok) setStep("added");
                  else setAddError(true);
                })
              }
              className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-orange px-4 text-[14px] font-bold text-white shadow-orange transition-colors hover:bg-[#ee4a10] disabled:opacity-60"
            >
              {t("add", { requester })}
            </button>
            <button
              type="button"
              onClick={() => setStep("skipped")}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-lilac-2 px-4 text-[14px] font-bold text-ink"
            >
              {t("later")}
            </button>
          </div>
        </div>
      ) : null}
      {step === "added" ? (
        <p className="rounded-[14px] bg-olive-2 px-3.5 py-2.5 text-[13px] font-semibold text-[#28553b]">{t("added", { requester })}</p>
      ) : null}

      <Link
        href="/chat"
        className="flex w-full items-center gap-2 rounded-[18px] border-2 border-line-strong bg-white py-2 pe-2 ps-4 text-start text-[14.5px] text-soft"
      >
        <span className="min-w-0 flex-1 truncate">{t("askPlaceholder")}</span>
        <span className="inline-flex min-h-9 items-center rounded-full bg-orange px-3.5 text-[13px] font-bold text-white">{t("ask")}</span>
      </Link>
      <p className="text-[11.5px] leading-snug text-soft">{t("pitch")}</p>
    </div>
  );
}
