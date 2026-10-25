"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PersonAvatar } from "@/components/results/marks";
import type { CreateRequestResponse, PreparedRecipient } from "@/lib/conversations/schema";
import { joinNames } from "@/lib/network/message";
import type { SuggestedPerson } from "@/lib/search/types";

const EYEBROW = "text-[11px] font-bold tracking-[0.14em] text-muted uppercase";
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
        throw new Error((json && "error" in json && json.error?.message) || "Je n’arrive pas à préparer la demande.");
      }
      setStep({ kind: "open", recipients: json.recipients });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Je n’arrive pas à préparer la demande.");
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
        ‹ Retour à la conversation
      </Link>
    );

  if (step.kind === "compose") {
    return (
      <div className="flex flex-col gap-4">
        {backLink}
        <div className={EYEBROW}>Demander à mon réseau</div>
        <h1 className="font-display text-[28px] font-normal leading-[1.12] tracking-[-0.01em]">
          J’ai préparé la question. Tu gardes la main.
        </h1>
        <p className="text-[12.5px] text-muted">
          Modifie le message si tu veux, choisis les destinataires. Rien ne part sans ta confirmation.
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1000}
          aria-label="Message"
          className="min-h-[110px] w-full resize-none rounded-[14px] border-[1.5px] border-line bg-cream-2 px-3.5 py-3 text-[14px] text-ink outline-none focus:border-ink"
        />
        <div>
          <div className={`${EYEBROW} mb-2`}>Destinataires suggérés</div>
          {candidates.length === 0 ? (
            <p className="text-[12.5px] text-muted">
              Ton cercle est vide pour l’instant. Ajoute quelques personnes de confiance dans Mon cercle.
            </p>
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
                    className={`flex items-center gap-3 rounded-[16px] border bg-cream-2 p-3 text-left transition-colors ${on ? "border-ink" : "border-line"}`}
                  >
                    <PersonAvatar person={c} />
                    <span>
                      <span className="block font-bold">{c.name}</span>
                      <span className="block text-[12.5px] text-muted">{c.reason}</span>
                    </span>
                    <span
                      aria-hidden
                      className={`ml-auto inline-flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] text-[13px] text-white ${on ? "border-ink bg-ink" : "border-line"}`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-start gap-2.5 rounded-[14px] bg-sand-2 px-3.5 py-3 text-[13.5px] leading-[1.4] text-ink-2">
          <span aria-hidden>🎯</span>
          <span>Tu demandes seulement aux personnes les plus pertinentes, pas à tout ton carnet d’adresses.</span>
        </div>
        <button
          type="button"
          disabled={chosen.length === 0 || message.trim().length < 10}
          onClick={() => setStep({ kind: "confirm" })}
          className={`${BTN} ${WA}`}
        >
          Envoyer individuellement sur WhatsApp{chosen.length ? ` (${chosen.length})` : ""}
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
            <span key={c.id} className={`rounded-full border-2 border-cream ${i > 0 ? "-ml-2" : ""}`}>
              <PersonAvatar person={c} />
            </span>
          ))}
        </span>
        <h1 className="font-display text-[28px] font-normal leading-[1.12] tracking-[-0.01em]">
          Envoyer à {joinNames(chosen.map((c) => c.name))} ?
        </h1>
        <p className="text-[12.5px] text-muted">
          Un message WhatsApp par personne, chacun avec son lien privé pour répondre sans rien installer.
        </p>
        <div className="w-full rounded-card border border-line bg-cream-2 p-4 text-left">
          <div className="mb-1.5 text-[11.5px] text-soft">Aperçu</div>
          <div className="text-[13.5px] whitespace-pre-line">{message.trim()}</div>
          <div className="mt-2 text-[11.5px] text-blue">Lien privé · Répondre en 20 secondes</div>
        </div>
        {error ? (
          <p role="alert" className="w-full rounded-[14px] bg-amber-2 px-3.5 py-3 text-[13.5px] text-[#6e4f14]">
            {error}
          </p>
        ) : null}
        <div className="flex w-full gap-2.5">
          <button type="button" onClick={() => setStep({ kind: "compose" })} className={`${BTN} ${GHOST} flex-1`}>
            Modifier
          </button>
          <button type="button" disabled={pending} onClick={() => void confirm()} className={`${BTN} ${WA} flex-1`}>
            Confirmer l’envoi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className={EYEBROW}>Demander à mon réseau</div>
      <h1 className="font-display text-[28px] font-normal leading-[1.12] tracking-[-0.01em]">
        Un message par personne.
      </h1>
      <p className="text-[12.5px] text-muted">
        WhatsApp s’ouvre avec le message et le lien privé déjà prêts : c’est toi qui appuies sur Envoyer.
      </p>
      <div className="flex flex-col gap-2">
        {step.recipients.map((r) => {
          const person = candidates.find((c) => c.id === r.memberId);
          return (
            <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-[16px] border border-line bg-cream-2 p-3">
              {person ? <PersonAvatar person={person} /> : null}
              <span className="font-bold">{r.name}</span>
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => void copy(r)} className="inline-flex min-h-[30px] items-center rounded-full bg-sand-2 px-[11px] text-[12.5px] font-semibold text-ink hover:bg-sand">
                  {copied === r.id ? "Lien copié" : "Copier le lien privé"}
                </button>
                <a
                  href={r.waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => markOpened(r)}
                  className={`inline-flex min-h-[30px] items-center rounded-full px-[11px] text-[12.5px] font-semibold ${opened.has(r.id) ? "bg-olive-2 text-olive" : WA}`}
                >
                  {opened.has(r.id) ? "WhatsApp ouvert ✓" : "Ouvrir WhatsApp"}
                </a>
              </span>
            </div>
          );
        })}
      </div>
      <button type="button" onClick={() => router.push(back)} className={`${BTN} ${opened.size > 0 ? "bg-ink text-cream" : GHOST}`}>
        Revenir à la conversation
      </button>
    </div>
  );
}
