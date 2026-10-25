"use client";

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
  "inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-[14.5px] font-bold text-cream transition-colors hover:bg-[#0f1722]";
const SECONDARY =
  "inline-flex min-h-[46px] w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-line px-5 text-[14.5px] font-bold text-ink transition-colors hover:border-ink";
const BACK = "self-start text-[13px] font-semibold text-blue hover:underline";

function CopyBox({ value, big = false }: { value: string; big?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] border-[1.5px] border-line bg-cream px-3.5 py-2.5">
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
        className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-ink px-3.5 text-[13px] font-bold text-cream transition-colors hover:bg-[#0f1722]"
      >
        {copied ? "Copié ✓" : "Copier"}
      </button>
    </div>
  );
}

/** Une consigne numérotée, une seule action à la fois. */
function Do({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3 text-[14px] leading-normal">
      <span aria-hidden className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-sand-2 text-[12px] font-bold">
        {n}
      </span>
      <div className="flex min-w-0 grow flex-col gap-2">{children}</div>
    </li>
  );
}

function Progress({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Étape {step} sur 3</div>
      <div className="flex gap-1.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <i key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-coral" : "bg-sand"}`} />
        ))}
      </div>
    </div>
  );
}

function Choice({ icon, title, text, badge, onClick }: { icon: string; title: string; text: string; badge?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 rounded-card border-[1.5px] border-line bg-cream-2 p-4 text-left transition hover:-translate-y-px hover:border-ink"
    >
      <span aria-hidden className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-[14px] bg-sand-2 text-[19px]">
        {icon}
      </span>
      <span className="min-w-0 grow">
        <span className="flex flex-wrap items-center gap-2 font-bold">
          {title}
          {badge ? <span className="rounded-full bg-olive-2 px-2 py-0.5 text-[11px] font-bold text-olive">{badge}</span> : null}
        </span>
        <span className="block text-[12.5px] text-muted">{text}</span>
      </span>
      <span aria-hidden className="text-soft">
        ›
      </span>
    </button>
  );
}

/**
 * « Comment veux-tu retrouver tes réservations ? » : automatiquement par un filtre Gmail (assistant
 * en trois étapes, une action à la fois) ou à la main. WHERE ne se connecte jamais à Gmail.
 */
export function ImportSetup({
  address,
  accountEmail,
  links,
  query,
  confirmation,
  active,
}: {
  address: string;
  accountEmail: string;
  links: { forwarding: string; search: string };
  query: string;
  confirmation: { code: string; requester: string | null } | null;
  /** Un email d'une plateforme est déjà arrivé : le filtre fonctionne. */
  active: boolean;
}) {
  const [mode, setMode] = useState<Mode>(active ? "gmail" : "choose");
  const [step, setStep] = useState<Step>(active ? "done" : 1);

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

  const card = "flex flex-col gap-4 rounded-card-lg border border-line bg-cream-2 p-5 shadow-soft";

  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-2.5">
        <h2 className="font-display text-[21px] font-medium leading-tight">Comment veux-tu retrouver tes réservations ?</h2>
        <Choice
          icon="✨"
          title="Automatiquement, depuis Gmail"
          badge="Recommandé"
          text="3 étapes, 2 minutes. Gmail n’envoie à WHERE que les emails de réservation, rien d’autre."
          onClick={() => go(1)}
        />
        <Choice
          icon="✉️"
          title="À la main, un email à la fois"
          text="Tu transfères toi-même une confirmation de restaurant, d’hôtel ou d’activité."
          onClick={() => setMode("manual")}
        />
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className={card}>
        <button type="button" onClick={() => setMode("choose")} className={BACK}>
          ‹ Retour
        </button>
        <h2 className="font-display text-[21px] font-medium leading-tight">Transfère une confirmation</h2>
        <ol className="flex flex-col gap-4">
          <Do n={1}>Ouvre un email de confirmation : un restaurant, un hôtel, une activité.</Do>
          <Do n={2}>
            Clique sur « Transférer » et envoie-le à cette adresse :
            <CopyBox value={address} />
          </Do>
          <Do n={3}>
            <span>
              Envoie-le depuis <b>{accountEmail}</b>, l’adresse de ton compte WHERE. Il apparaîtra ici en quelques secondes.
            </span>
          </Do>
        </ol>
        <p className="text-[12px] text-muted">Les livraisons sont écartées : une commande Tabit ou Wolt n’est pas une visite au restaurant.</p>
      </div>
    );
  }

  if (step === "done") {
    return (
      <div className={card}>
        <div className="flex items-start gap-3">
          <span aria-hidden className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-olive text-[18px] text-white">
            ✓
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-[21px] font-medium leading-tight">
              {active ? "Le transfert automatique fonctionne." : "C’est en place."}
            </h2>
            <p className="text-[14px] text-muted">
              {active
                ? "Tes nouvelles confirmations arrivent ici toutes seules. Tu les valides avant qu’elles entrent dans ta mémoire."
                : "Ta prochaine confirmation d’Ontopo, Tabit, Booking ou Airbnb apparaîtra ici toute seule."}
            </p>
          </div>
        </div>
        <div className="rounded-[14px] bg-sand-2 px-3.5 py-3 text-[13px] text-ink-2">
          Gmail ne transfère que les nouveaux emails. Pour tes anciennes réservations,{" "}
          <button type="button" onClick={() => setMode("manual")} className="font-semibold text-blue hover:underline">
            transfère-les à la main
          </button>
          .
        </div>
        {!active ? (
          <button type="button" onClick={() => go(1)} className={BACK}>
            Recommencer l’assistant
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={card}>
      <button type="button" onClick={() => (step === 1 ? go(null) : go((step - 1) as Step))} className={BACK}>
        ‹ Retour
      </button>
      <Progress step={step} />

      {step === 1 ? (
        <>
          <h2 className="font-display text-[21px] font-medium leading-tight">Donne ton adresse WHERE à Gmail</h2>
          <ol className="flex flex-col gap-4">
            <Do n={1}>
              Copie ton adresse WHERE :
              <CopyBox value={address} />
            </Do>
            <Do n={2}>
              <span>
                Ouvre Gmail, clique sur <b>« Ajouter une adresse de transfert »</b>, colle l’adresse et valide.
              </span>
              <a href={links.forwarding} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
                Ouvrir Gmail ↗
              </a>
            </Do>
          </ol>
          <button type="button" onClick={() => go(2)} className={PRIMARY}>
            C’est fait, étape suivante
          </button>
        </>
      ) : step === 2 ? (
        <>
          <h2 className="font-display text-[21px] font-medium leading-tight">Confirme avec le code</h2>
          {confirmation ? (
            <ol className="flex flex-col gap-4">
              <Do n={1}>
                Gmail a envoyé ce code à WHERE{confirmation.requester ? ` pour ${confirmation.requester}` : ""} :
                <CopyBox value={confirmation.code} big />
              </Do>
              <Do n={2}>
                <span>
                  Retourne dans Gmail, colle le code et clique sur <b>« Valider »</b>.
                </span>
              </Do>
              <Do n={3}>
                <span>
                  Laisse <b>« Désactiver le transfert »</b> sélectionné : seuls les emails de réservation seront transférés,
                  grâce à l’étape suivante.
                </span>
              </Do>
            </ol>
          ) : (
            <div className="flex items-center gap-3 rounded-[14px] bg-sand-2 px-3.5 py-4 text-[14px] text-ink-2">
              <span aria-hidden className="inline-flex gap-1">
                {[0, 1, 2].map((i) => (
                  <i key={i} style={{ animationDelay: `${i * 0.2}s` }} className="size-1.5 animate-blink rounded-full bg-soft" />
                ))}
              </span>
              <span>J’attends le code que Gmail envoie à WHERE. Il apparaît ici tout seul, en quelques secondes.</span>
            </div>
          )}
          <button type="button" onClick={() => go(3)} disabled={!confirmation} className={`${PRIMARY} disabled:opacity-40`}>
            C’est validé, étape suivante
          </button>
          {!confirmation ? (
            <button type="button" onClick={() => go(3)} className={BACK}>
              J’ai déjà validé le code dans Gmail
            </button>
          ) : null}
        </>
      ) : (
        <>
          <h2 className="font-display text-[21px] font-medium leading-tight">Ne transfère que les réservations</h2>
          <ol className="flex flex-col gap-4">
            <Do n={1}>
              <span>Ouvre Gmail : la recherche des emails de réservation est déjà remplie.</span>
              <a href={links.search} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
                Ouvrir la recherche dans Gmail ↗
              </a>
            </Do>
            <Do n={2}>
              <span>
                Dans la barre de recherche, clique sur l’icône des options (à droite), puis sur <b>« Créer un filtre »</b>.
              </span>
            </Do>
            <Do n={3}>
              <span>
                Coche <b>« Le transférer à »</b>, choisis ton adresse WHERE, puis clique sur <b>« Créer un filtre »</b>.
              </span>
            </Do>
          </ol>
          <details className="text-[12.5px] text-muted">
            <summary className="cursor-pointer font-semibold text-blue">La recherche ne s’est pas remplie ?</summary>
            <div className="mt-2 flex flex-col gap-2">
              Copie-la et colle-la dans la barre de recherche de Gmail :
              <CopyBox value={query} />
            </div>
          </details>
          <button type="button" onClick={() => go("done")} className={PRIMARY}>
            C’est fait
          </button>
        </>
      )}
    </div>
  );
}
