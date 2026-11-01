"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type ReactNode } from "react";

type Mode = "choose" | "gmail" | "manual";
type Step = 1 | 2 | 3 | "done";

/** Étape de l'assistant gardée dans ce navigateur, pour reprendre où on en était. Facultatif. */
const STORAGE_KEY = "where.import.gmail-step";

function readStep(): Step | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "1" || v === "2" || v === "3" ? (Number(v) as Step) : v === "done" ? "done" : null;
  } catch {
    return null;
  }
}

function writeStep(step: Step | null) {
  try {
    if (step === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, String(step));
  } catch {
    // Navigation privée : l'assistant repartira simplement du début.
  }
}

const PRIMARY =
  "inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-[14.5px] font-bold text-paper transition-colors hover:bg-night";
const SECONDARY =
  "inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-line px-5 text-[14.5px] font-bold text-ink transition-colors hover:border-ink";
const BACK = "self-start text-[13px] font-semibold text-blue hover:underline";

function CopyBox({ value, big = false }: { value: string; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations("import");
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-line bg-paper px-3.5 py-2.5">
      <code
        className={`min-w-0 grow truncate font-sans font-semibold text-ink ${big ? "text-[22px] tracking-[0.12em]" : "text-[14px]"}`}
        title={value}
      >
        {value}
      </code>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          });
        }}
        className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-ink px-3.5 text-[13px] font-bold text-paper transition-colors hover:bg-night"
      >
        {copied ? t("copy.copied") : t("copy.copy")}
      </button>
    </div>
  );
}

/** Une consigne numérotée, une seule action à la fois. */
function Do({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-[14px] leading-normal">
      <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-lilac-2 text-[12px] font-bold">
        {n}
      </span>
      <div className="flex min-w-0 grow flex-col gap-2">{children}</div>
    </li>
  );
}

function Progress({ step }: { step: 1 | 2 | 3 }) {
  const t = useTranslations("import");
  return (
    <div className="flex flex-col gap-2">
      <div className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{t("setup.progress", { step })}</div>
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <i key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-orange" : "bg-lilac"}`} />
        ))}
      </div>
    </div>
  );
}

function Choice({ title, text, badge, onClick }: { title: string; text: string; badge?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-card border-[1.5px] border-line bg-paper-2 p-4 text-start transition hover:-translate-y-px hover:border-ink"
    >
      <span className="min-w-0 grow">
        <span className="flex flex-wrap items-center gap-2 font-bold">
          {title}
          {badge ? <span className="rounded-full bg-olive-2 px-2 py-0.5 text-[11px] font-bold text-olive">{badge}</span> : null}
        </span>
        <span className="block text-[12.5px] text-muted">{text}</span>
      </span>
      <span aria-hidden className="text-soft inline-block rtl:-scale-x-100">
        ›
      </span>
    </button>
  );
}

/**
 * « Comment veux-tu retrouver tes réservations ? » : automatiquement par un filtre Gmail (assistant
 * en trois étapes, une action à la fois) ou à la main. WH3RE ne se connecte jamais à Gmail.
 */
export function ImportSetup({
  address,
  accountEmail,
  links,
  query,
  confirmation,
  active,
  receiving,
}: {
  address: string;
  accountEmail: string;
  links: { forwarding: string; search: string };
  query: string;
  confirmation: { code: string; requester: string | null } | null;
  /** Un email d'une plateforme est déjà arrivé : le filtre fonctionne. */
  active: boolean;
  /** La réception des emails est configurée ; sinon, rien de ce qui est envoyé n'arriverait. */
  receiving: boolean;
}) {
  const [mode, setMode] = useState<Mode>(active ? "gmail" : "choose");
  const [step, setStep] = useState<Step>(active ? "done" : 1);
  const t = useTranslations("import");
  const b = (chunks: ReactNode) => <b>{chunks}</b>;

  // Reprend l'assistant là où il en était (la page se rafraîchit pendant l'attente du code).
  useEffect(() => {
    if (active) return;
    const saved = readStep();
    if (saved === null) return;
    const t = setTimeout(() => {
      setMode("gmail");
      setStep(saved);
    });
    return () => clearTimeout(t);
  }, [active]);

  function go(next: Step | null) {
    writeStep(next);
    if (next === null) {
      setMode("choose");
      setStep(1);
    } else {
      setMode("gmail");
      setStep(next);
    }
  }

  const card = "flex flex-col gap-4 rounded-card-lg border border-line bg-paper-2 p-5 shadow-soft";

  if (!receiving) {
    return (
      <div className="flex items-start gap-3 rounded-card border border-line bg-amber-2 p-4 text-[14px] text-[#6e4f14]">
        <span>{t.rich("setup.notReceiving", { b })}</span>
      </div>
    );
  }

  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-2.5">
        <h2 className="font-display text-[21px] font-bold leading-tight">{t("setup.chooseTitle")}</h2>
        <Choice
          title={t("setup.auto.title")}
          badge={t("setup.auto.badge")}
          text={t("setup.auto.text")}
          onClick={() => go(1)}
        />
        <Choice
          title={t("setup.byHand.title")}
          text={t("setup.byHand.text")}
          onClick={() => setMode("manual")}
        />
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className={card}>
        <button type="button" onClick={() => setMode("choose")} className={BACK}>
          {t("setup.back")}
        </button>
        <h2 className="font-display text-[21px] font-bold leading-tight">{t("setup.manual.title")}</h2>
        <ol className="flex flex-col gap-4">
          <Do n={1}>{t("setup.manual.step1")}</Do>
          <Do n={2}>
            {t("setup.manual.step2")}
            <CopyBox value={address} />
          </Do>
          <Do n={3}>
            <span>{t.rich("setup.manual.step3", { email: accountEmail, b })}</span>
          </Do>
        </ol>
        <p className="text-[12px] text-muted">{t("setup.manual.deliveries")}</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className={card}>
        <div className="flex items-start gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[21px] font-bold leading-tight">
              {active ? t("setup.done.activeTitle") : t("setup.done.title")}
            </h2>
            <p className="text-[14px] text-muted">
              {active ? t("setup.done.activeText") : t("setup.done.text")}
            </p>
          </div>
        </div>
        <div className="rounded-[14px] bg-lilac-2 px-3.5 py-3 text-[13px] text-ink-2">
          {t.rich("setup.done.oldEmails", {
            manual: (chunks) => (
              <button type="button" onClick={() => setMode("manual")} className="font-semibold text-blue hover:underline">
                {chunks}
              </button>
            ),
          })}
        </div>
        {!active ? (
          <button type="button" onClick={() => go(1)} className={BACK}>
            {t("setup.done.restart")}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={card}>
      <button type="button" onClick={() => (step === 1 ? go(null) : go((step - 1) as Step))} className={BACK}>
        {t("setup.back")}
      </button>
      <Progress step={step} />

      {step === 1 ? (
        <>
          <h2 className="font-display text-[21px] font-bold leading-tight">{t("setup.step1.title")}</h2>
          <ol className="flex flex-col gap-4">
            <Do n={1}>
              {t("setup.step1.copy")}
              <CopyBox value={address} />
            </Do>
            <Do n={2}>
              <span>{t.rich("setup.step1.open", { b })}</span>
              <a href={links.forwarding} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
                {t("setup.step1.openGmail")}
              </a>
              <p className="rounded-[12px] bg-amber-2 px-3 py-2 text-[12.5px] text-[#6e4f14]">
                {t("setup.step1.workspace")}
              </p>
            </Do>
          </ol>
          <button type="button" onClick={() => go(2)} className={PRIMARY}>
            {t("setup.step1.next")}
          </button>
        </>
      ) : step === 2 ? (
        <>
          <h2 className="font-display text-[21px] font-bold leading-tight">{t("setup.step2.title")}</h2>
          {confirmation ? (
            <ol className="flex flex-col gap-4">
              <Do n={1}>
                {confirmation.requester
                  ? t("setup.step2.codeSentFor", { requester: confirmation.requester })
                  : t("setup.step2.codeSent")}
                <CopyBox value={confirmation.code} big />
              </Do>
              <Do n={2}>
                <span>{t.rich("setup.step2.paste", { b })}</span>
              </Do>
              <Do n={3}>
                <span>{t.rich("setup.step2.keepDisabled", { b })}</span>
              </Do>
            </ol>
          ) : (
            <div className="flex items-center gap-3 rounded-[14px] bg-lilac-2 px-3.5 py-4 text-[14px] text-ink-2">
              <span aria-hidden className="inline-flex gap-1">
                {[0, 1, 2].map((i) => (
                  <i key={i} style={{ animationDelay: `${i * 0.2}s` }} className="size-1.5 animate-blink rounded-full bg-soft" />
                ))}
              </span>
              <span>{t("setup.step2.waiting")}</span>
            </div>
          )}
          <button type="button" onClick={() => go(3)} disabled={!confirmation} className={`${PRIMARY} disabled:opacity-40`}>
            {t("setup.step2.next")}
          </button>
          {!confirmation ? (
            <button type="button" onClick={() => go(3)} className={BACK}>
              {t("setup.step2.alreadyDone")}
            </button>
          ) : null}
        </>
      ) : (
        <>
          <h2 className="font-display text-[21px] font-bold leading-tight">{t("setup.step3.title")}</h2>
          <ol className="flex flex-col gap-4">
            <Do n={1}>
              <span>{t("setup.step3.open")}</span>
              <a href={links.search} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
                {t("setup.step3.openSearch")}
              </a>
            </Do>
            <Do n={2}>
              <span>{t.rich("setup.step3.options", { b })}</span>
            </Do>
            <Do n={3}>
              <span>{t.rich("setup.step3.forward", { b })}</span>
            </Do>
          </ol>
          <details className="text-[12.5px] text-muted">
            <summary className="cursor-pointer font-semibold text-blue">{t("setup.step3.notFilled")}</summary>
            <div className="mt-2 flex flex-col gap-2">
              {t("setup.step3.copyQuery")}
              <CopyBox value={query} />
            </div>
          </details>
          <button type="button" onClick={() => go("done")} className={PRIMARY}>
            {t("setup.step3.done")}
          </button>
        </>
      )}
    </div>
  );
}
