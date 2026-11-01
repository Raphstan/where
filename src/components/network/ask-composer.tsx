"use client";

import { CheckIcon } from "@/components/shell/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { PersonAvatar } from "@/components/results/marks";
import type { CreateRequestResponse, PreparedRecipient } from "@/lib/conversations/schema";
import { joinNames } from "@/lib/network/message";
import type { SuggestedPerson } from "@/lib/search/types";

const EYEBROW = "font-mono text-[11px] font-medium tracking-[0.08em] text-muted uppercase";
const BTN = "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full px-5 text-[14.5px] font-bold transition-colors disabled:opacity-50";
const WA = "bg-[#25d366] text-white";
const GHOST = "border-[1.5px] border-line bg-transparent text-ink hover:border-ink";

type Step = { kind: "compose" } | { kind: "confirm" } | { kind: "open"; recipients: PreparedRecipient[] };

/**
 * Demander à mon réseau (docs/prototype.html, scrAsk) : message modifiable, destinataires,
 * confirmation explicite, puis un lien WhatsApp par proche que l'utilisateur ouvre lui-même.
 * Le serveur n'envoie rien.
 */
export function AskComposer({
  conversationId,
  draft,
  candidates,
}: {
  conversationId: string;
  draft: string;
  candidates: SuggestedPerson[];
}) {
  const router = useRouter();
  const t = useTranslations("network");
  const [message, setMessage] = useState(draft);
  const [selected, setSelected] = useState(() => new Set(candidates.filter((c) => c.relevant).map((c) => c.id)));
  const [step, setStep] = useState<Step>({ kind: "compose" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState(() => new Set<string>());
  const [copied, setCopied] = useState<string | null>(null);

  const chosen = candidates.filter((c) => selected.has(c.id));
  const back = `/chat/${conversationId}`;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirm() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ conversationId, message, recipientIds: chosen.map((c) => c.id) }),
      });
      const json = (await res.json().catch(() => null)) as CreateRequestResponse | { error?: { message?: string } } | null;
      if (!res.ok || !json || !("recipients" in json)) {
        throw new Error((json && "error" in json && json.error?.message) || t("ask.prepareFailed"));
      }
      setStep({ kind: "open", recipients: json.recipients });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("ask.prepareFailed"));
    } finally {
      setPending(false);
    }
  }

  function markOpened(r: PreparedRecipient) {
    setOpened((prev) => new Set(prev).add(r.id));
    void fetch(`/api/requests/recipients/${r.id}/sent`, { method: "POST" });
  }

  async function copy(r: PreparedRecipient) {
    try {
      await navigator.clipboard.writeText(r.link);
      setCopied(r.id);
      markOpened(r);
    } catch {
      setCopied(null);
    }
  }

  const backLink =
    step.kind === "open" ? null : (
      <Link href={back} className="text-[13.5px] font-semibold text-blue hover:underline">
        <span aria-hidden className="inline-block">‹</span> {t("ask.backToConversation")}
      </Link>
    );

  if (step.kind === "compose") {
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        <div className={EYEBROW}>{t("ask.eyebrow")}</div>
        <h1 className="font-display text-[28px] font-bold leading-[1.12] tracking-[-0.02em]">{t("ask.title")}</h1>
        <p className="text-[12.5px] text-muted">{t("ask.lead")}</p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          aria-label={t("ask.messageLabel")}
          className="min-h-[110px] w-full resize-none rounded-[14px] border-[1.5px] border-line bg-paper-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-ink"
        />
        <div>
          <div className={`${EYEBROW} mb-2`}>{t("ask.suggested")}</div>
          {candidates.length === 0 ? (
            <p className="text-[12.5px] text-muted">{t("ask.emptyCircle")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {candidates.map((c) => {
                const on = selected.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(c.id)}
                    className={`flex items-center gap-3 rounded-[16px] border bg-paper-2 p-3 text-start transition-colors ${on ? "border-ink" : "border-line"}`}
                  >
                    <PersonAvatar person={c} />
                    <span>
                      <span className="block font-bold">{c.name}</span>
                      <span className="block text-[12.5px] text-muted">{c.reason}</span>
                    </span>
                    <span
                      aria-hidden
                      className={`ms-auto inline-flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[13px] text-white ${on ? "border-ink bg-ink" : "border-line"}`}
                    >
                      {on ? <CheckIcon className="size-3.5" /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-start gap-2.5 rounded-[14px] bg-lilac-2 px-3.5 py-3 text-[13.5px] leading-[1.4] text-ink-2">
          <span>{t("ask.onlyRelevant")}</span>
        </div>
        <button
          type="button"
          disabled={chosen.length === 0 || message.trim().length < 10}
          onClick={() => setStep({ kind: "confirm" })}
          className={`${BTN} ${WA}`}
        >
          {chosen.length ? t("ask.sendIndividuallyCount", { count: chosen.length }) : t("ask.sendIndividually")}
        </button>
      </div>
    );
  }

  if (step.kind === "confirm") {
    return (
      <div className="flex flex-col items-center gap-4 pt-[30px] text-center">
        {backLink}
        <span className="inline-flex">
          {chosen.map((c, i) => (
            <span key={c.id} className={`rounded-full border-2 border-paper ${i > 0 ? "-ms-2" : ""}`}>
              <PersonAvatar person={c} />
            </span>
          ))}
        </span>
        <h1 className="font-display text-[28px] font-bold leading-[1.12] tracking-[-0.02em]">
          {t("ask.confirmTitle", { names: joinNames(t, chosen.map((c) => c.name)) })}
        </h1>
        <p className="text-[12.5px] text-muted">{t("ask.confirmLead")}</p>
        <div className="w-full rounded-card border border-line bg-paper-2 p-4 text-start">
          <div className="mb-1.5 text-[11.5px] text-soft">{t("ask.preview")}</div>
          <div className="text-[13.5px] whitespace-pre-line">{message.trim()}</div>
          <div className="mt-2 text-[11.5px] text-blue">{t("ask.previewLink")}</div>
        </div>
        {error ? (
          <p role="alert" className="w-full rounded-[14px] bg-amber-2 px-3.5 py-3 text-[13.5px] text-[#6e4f14]">
            {error}
          </p>
        ) : null}
        <div className="flex w-full gap-2.5">
          <button type="button" onClick={() => setStep({ kind: "compose" })} className={`${BTN} ${GHOST} flex-1`}>
            {t("ask.edit")}
          </button>
          <button type="button" disabled={pending} onClick={() => void confirm()} className={`${BTN} ${WA} flex-1`}>
            {t("ask.confirm")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={EYEBROW}>{t("ask.eyebrow")}</div>
      <h1 className="font-display text-[28px] font-bold leading-[1.12] tracking-[-0.02em]">{t("ask.openTitle")}</h1>
      <p className="text-[12.5px] text-muted">{t("ask.openLead")}</p>
      <div className="flex flex-col gap-2">
        {step.recipients.map((r) => {
          const person = candidates.find((c) => c.id === r.memberId);
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-[16px] border border-line bg-paper-2 p-3">
              {person ? <PersonAvatar person={person} /> : null}
              <span className="font-bold">{r.name}</span>
              <span className="ms-auto flex gap-2">
                <button type="button" onClick={() => void copy(r)} className="inline-flex min-h-[30px] items-center rounded-full bg-lilac-2 px-[11px] text-[12.5px] font-semibold text-ink hover:bg-lilac">
                  {copied === r.id ? t("ask.copied") : t("ask.copy")}
                </button>
                <a
                  href={r.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markOpened(r)}
                  className={`inline-flex min-h-[30px] items-center rounded-full px-[11px] text-[12.5px] font-semibold ${opened.has(r.id) ? "bg-olive-2 text-olive" : WA}`}
                >
                  {opened.has(r.id) ? t("ask.opened") : t("ask.open")}
                </a>
              </span>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => router.push(back)} className={`${BTN} ${opened.size > 0 ? "bg-ink text-paper" : GHOST}`}>
        {t("ask.backBottom")}
      </button>
    </div>
  );
}
