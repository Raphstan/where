"use client";

import { useState, type ReactNode } from "react";
import { formatDay } from "@/lib/inbound/rules";

function Copy({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-line bg-cream px-3.5 py-2.5">
      <code className="min-w-0 grow truncate font-sans text-[13px] font-semibold text-ink" title={value}>
        {value}
      </code>
      <button
        type="button"
        aria-label={label}
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          });
        }}
        className="inline-flex min-h-8 shrink-0 items-center rounded-full bg-ink px-3 text-[12.5px] font-bold text-cream transition-colors hover:bg-[#0f1722]"
      >
        {copied ? "Copié" : "Copier"}
      </button>
    </div>
  );
}

function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span
        aria-hidden
        className={`inline-flex size-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          done ? "bg-olive text-white" : "bg-sand-2 text-ink"
        }`}
      >
        {done ? "✓" : n}
      </span>
      <div className="flex min-w-0 grow flex-col gap-2">
        <div className="text-[13.5px] font-bold">{title}</div>
        {children}
      </div>
    </div>
  );
}

const LINK = "self-start text-[12.5px] font-semibold text-blue hover:underline";

/**
 * Transfert automatique sans partager sa boîte mail : un filtre Gmail ne transfère que les emails des
 * plateformes de réservation. WHERE ne se connecte jamais à Gmail ; il affiche seulement le code de
 * confirmation que Gmail lui envoie, à recopier par l'utilisateur.
 */
export function GmailFilterGuide({
  address,
  query,
  links,
  confirmation,
  lastPlatformEmailAt,
}: {
  address: string;
  query: string;
  links: { forwarding: string; search: string };
  confirmation: { code: string; requester: string | null } | null;
  lastPlatformEmailAt: string | null;
}) {
  const active = lastPlatformEmailAt !== null;
  return (
    <div className="flex flex-col gap-3.5 rounded-card border border-line bg-cream-2 p-4 shadow-soft">
      <div className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Transfert automatique depuis Gmail</div>
      <p className="text-[12.5px] text-muted">
        Sans partager ta boîte mail : un filtre Gmail transfère seulement les emails d’Ontopo, Tabit, Booking, Airbnb,
        OpenTable, Resy et Restu. WHERE ne lit rien d’autre et ne se connecte jamais à ton compte.
      </p>

      {active ? (
        <div className="flex items-start gap-2.5 rounded-[14px] bg-olive-2 px-3.5 py-3 text-[13px] text-[#375434]">
          <span aria-hidden>✓</span>
          <span>
            <b>Transfert automatique actif.</b> Dernier email reçu d’une plateforme : {formatDay(lastPlatformEmailAt.slice(0, 10), true)}.
          </span>
        </div>
      ) : null}

      <Step n={1} done={active || confirmation !== null} title="Ajoute ton adresse WHERE comme adresse de transfert">
        <Copy value={address} label="Copier l’adresse de transfert" />
        <p className="text-[12px] text-muted">Gmail → Paramètres → Transfert et POP/IMAP → « Ajouter une adresse de transfert ».</p>
        <a href={links.forwarding} target="_blank" rel="noopener noreferrer" className={LINK}>
          Ouvrir les paramètres de transfert de Gmail ↗
        </a>
      </Step>

      <Step n={2} done={active} title="Confirme avec le code que Gmail envoie à WHERE">
        {confirmation ? (
          <>
            <Copy value={confirmation.code} label="Copier le code de confirmation" />
            <p className="text-[12px] text-muted">
              Code reçu{confirmation.requester ? ` pour ${confirmation.requester}` : ""}. Recopie-le dans Gmail, puis clique sur
              « Valider ». WHERE ne confirme rien à ta place.
            </p>
          </>
        ) : (
          <p className="text-[12px] text-muted">
            Le code apparaîtra ici quelques secondes après l’étape 1. Ne choisis pas « Transférer une copie des messages
            reçus » : seul le filtre de l’étape 3 doit transférer.
          </p>
        )}
      </Step>

      <Step n={3} done={active} title="Crée le filtre qui ne transfère que les réservations">
        <Copy value={query} label="Copier la recherche du filtre" />
        <p className="text-[12px] text-muted">
          Dans Gmail, ouvre cette recherche → « Afficher les options de recherche » → « Créer un filtre » → coche
          « Le transférer à » et choisis ton adresse WHERE.
        </p>
        <a href={links.search} target="_blank" rel="noopener noreferrer" className={LINK}>
          Ouvrir la recherche dans Gmail ↗
        </a>
      </Step>

      <p className="text-[11.5px] text-soft">
        Gmail ne transfère que les nouveaux emails. Pour tes anciennes réservations, transfère-les à la main à la même
        adresse. Rien n’entre dans ta mémoire sans que tu le valides.
      </p>
    </div>
  );
}
