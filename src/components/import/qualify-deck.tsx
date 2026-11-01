"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { EvidenceDot, hashIndex } from "@/components/results/marks";
import {
  OCCASIONS,
  occasionLabel,
  qualificationSummary,
  RECOMMEND_ENDS,
  RECOMMEND_KEY,
  VISITED_KEY,
  type Qualification,
  type QualifyAnswers,
  type RecommendAnswer,
  type VisitedAnswer,
} from "@/lib/inbound/rules";

const SCENES = 6;
const BTN = "inline-flex min-h-[50px] items-center justify-center rounded-full px-5 text-[14.5px] font-bold transition-[transform,background,border-color] active:scale-[0.97] disabled:opacity-50";
const PRIMARY = `${BTN} bg-ink text-paper hover:bg-night`;
const GHOST = `${BTN} border-[1.5px] border-line text-ink hover:border-ink`;

export type DeckCard = { id: string; placeName: string; city: string | null; provenance: string };

type Draft = { visited: VisitedAnswer | null; recommend: RecommendAnswer | null; occasion: (typeof OCCASIONS)[number][]; note: string };
const EMPTY: Draft = { visited: null, recommend: null, occasion: [], note: "" };

type Done = { card: DeckCard; answers: QualifyAnswers | null };

async function send(id: string, body: Qualification): Promise<void> {
  const res = await fetch(`/api/imports/${id}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  // Déjà qualifié (autre onglet) : la carte est traitée, on passe à la suivante.
  if (res.ok || res.status === 409) return;
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
  // Sans message du serveur, l'appelant affiche « Ta réponse n'est pas partie. » dans la bonne langue.
  throw new Error(json?.error?.message || "");
}

/**
 * Qualifier mes expériences (docs/prototype.html, scrQualify) : une carte par réservation retrouvée,
 * « Tu y es vraiment allé ? » → « Tu le recommanderais ? » → « Pour quelle occasion ? » → « Une chose
 * à savoir ? ». Chaque carte terminée est enregistrée : c'est elle qui crée les signaux.
 */
export function QualifyDeck({ cards }: { cards: DeckCard[] }) {
  const [idx, setIdx] = useState(0);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [done, setDone] = useState<Done[]>([]);
  const [out, setOut] = useState<"l" | "r" | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const card = cards[idx];
  const t = useTranslations("import");
  const tc = useTranslations("common");

  async function finish(answers: QualifyAnswers | null) {
    if (!card || pending) return;
    setPending(true);
    setError(null);
    try {
      await send(card.id, answers ?? { action: "skip" });
      setOut(answers ? "r" : "l");
      setTimeout(() => {
        setDone((d) => [...d, { card, answers }]);
        setIdx((i) => i + 1);
        setStep(0);
        setDraft(EMPTY);
        setOut(null);
        setPending(false);
      }, 280);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t("qualify.sendFailed"));
      setPending(false);
    }
  }

  function answers(d: Draft): QualifyAnswers {
    const visited = d.visited ?? "Je ne sais plus";
    const ends = d.recommend !== null && (RECOMMEND_ENDS as readonly string[]).includes(d.recommend);
    return {
      action: "qualify",
      visited,
      recommend: visited === "Oui" ? d.recommend : null,
      occasion: visited === "Oui" && !ends ? d.occasion : [],
      note: visited === "Oui" && !ends && d.note.trim() ? d.note.trim() : null,
    };
  }

  function pickVisited(v: VisitedAnswer) {
    const next = { ...draft, visited: v };
    setDraft(next);
    if (v === "Oui") setStep(1);
    else void finish(answers(next));
  }

  function pickRecommend(r: RecommendAnswer) {
    const next = { ...draft, recommend: r };
    setDraft(next);
    if ((RECOMMEND_ENDS as readonly string[]).includes(r)) void finish(answers(next));
    else setStep(2);
  }

  if (!card) {
    const qualified = done.filter((d) => d.answers).length;
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <span className="inline-flex size-16 items-center justify-center rounded-full bg-olive font-display text-[26px] text-white">
          ✓
        </span>
        <h1 className="font-display text-[28px] font-bold leading-[1.12] tracking-[-0.02em]">{t("qualify.doneTitle")}</h1>
        <p className="text-[15px] leading-normal text-muted">{t("qualify.doneLead", { count: qualified })}</p>
        {done.length > 0 ? (
          <div className="w-full rounded-card border border-line bg-paper-2 px-4 py-1 text-start">
            {done.map(({ card: c, answers: a }) => {
              const s = qualificationSummary(t, a);
              return (
                <div key={c.id} className="flex items-center gap-3 border-b border-line py-[11px] last:border-b-0">
                  <div className="min-w-0 grow">
                    <div className="font-bold">{c.placeName}</div>
                    <div className="text-[12.5px] text-muted">{s.text}</div>
                  </div>
                  <EvidenceDot level={s.level} />
                </div>
              );
            })}
          </div>
        ) : null}
        <Link href="/circle" className={`${PRIMARY} w-full`}>
          {t("qualify.doneCta")}
        </Link>
      </div>
    );
  }

  const label = card.city ? `${card.placeName} · ${card.city}` : card.placeName;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex min-h-10 items-center justify-between">
        <Link href="/import" aria-label={tc("back")} className="inline-flex size-10 items-center justify-center rounded-full text-[22px] text-ink hover:bg-lilac-2">
          ‹
        </Link>
        <span className="text-[12.5px] text-muted">
          {idx + 1} / {cards.length}
        </span>
      </div>
      <div className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{t("qualify.eyebrow")}</div>

      <div className="relative h-[430px]">
        <div aria-hidden className="absolute inset-0 translate-y-3 scale-95 rounded-card-lg border border-line bg-lilac-2" />
        <div
          key={card.id}
          className={`absolute inset-0 flex flex-col overflow-hidden rounded-card-lg border border-line bg-paper-2 shadow-soft ${
            out === "l" ? "animate-out-l" : out === "r" ? "animate-out-r" : "animate-pop"
          }`}
        >
          <div className={`scene h-[150px] shrink-0 scene-${hashIndex(card.id, SCENES)}`}>
            <span className="absolute bottom-3 start-3.5 z-[1] font-display text-[17px] text-white drop-shadow">{label}</span>
          </div>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="text-[11.5px] text-soft">{card.provenance}</div>

            {step === 0 ? (
              <>
                <div className="font-display text-[22px]">{t("qualify.visited")}</div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={pending} onClick={() => pickVisited("Oui")} className={PRIMARY}>
                    {t(`qualify.visitedAnswers.${VISITED_KEY.Oui}`)}
                  </button>
                  <button type="button" disabled={pending} onClick={() => pickVisited("Non")} className={GHOST}>
                    {t(`qualify.visitedAnswers.${VISITED_KEY.Non}`)}
                  </button>
                  <button type="button" disabled={pending} onClick={() => pickVisited("Je ne sais plus")} className={`${GHOST} col-span-2`}>
                    {t(`qualify.visitedAnswers.${VISITED_KEY["Je ne sais plus"]}`)}
                  </button>
                </div>
              </>
            ) : null}

            {step === 1 ? (
              <>
                <div className="font-display text-[22px]">{t("qualify.recommend")}</div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={pending} onClick={() => pickRecommend("Absolument")} className={`${PRIMARY} col-span-2`}>
                    {t(`qualify.recommendAnswers.${RECOMMEND_KEY.Absolument}`)}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => pickRecommend("Oui, dans certains contextes")}
                    className={`${GHOST} col-span-2`}
                  >
                    {t(`qualify.recommendAnswers.${RECOMMEND_KEY["Oui, dans certains contextes"]}`)}
                  </button>
                  <button type="button" disabled={pending} onClick={() => pickRecommend("Pas vraiment")} className={GHOST}>
                    {t(`qualify.recommendAnswers.${RECOMMEND_KEY["Pas vraiment"]}`)}
                  </button>
                  <button type="button" disabled={pending} onClick={() => pickRecommend("Non")} className={GHOST}>
                    {t(`qualify.recommendAnswers.${RECOMMEND_KEY.Non}`)}
                  </button>
                </div>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <div className="font-display text-[22px]">{t("qualify.occasion")}</div>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((o) => {
                    const on = draft.occasion.includes(o);
                    return (
                      <button
                        key={o}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setDraft((d) => ({ ...d, occasion: on ? d.occasion.filter((x) => x !== o) : [...d.occasion, o] }))
                        }
                        className={`inline-flex items-center rounded-full border-[1.5px] px-3.5 py-[9px] text-[13.5px] font-semibold transition-colors ${
                          on ? "border-ink bg-ink text-paper" : "border-line bg-paper-2 text-ink hover:border-ink"
                        }`}
                      >
                        {occasionLabel(t, o)}
                      </button>
                    );
                  })}
                </div>
                <button type="button" onClick={() => setStep(3)} className={`${PRIMARY} w-full`}>
                  {t("qualify.continue")}
                </button>
              </>
            ) : null}

            {step === 3 ? (
              <>
                <div className="font-display text-[22px]">{t("qualify.note")}</div>
                <p className="text-[11.5px] text-soft">{t("qualify.noteHint")}</p>
                <textarea
                  value={draft.note}
                  onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                  maxLength={600}
                  placeholder={t("qualify.notePlaceholder")}
                  aria-label={t("qualify.note")}
                  className="min-h-[88px] w-full resize-none rounded-[14px] border-[1.5px] border-line bg-paper-2 px-3.5 py-3 text-[14px] text-ink outline-none placeholder:text-soft focus:border-ink"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={pending} onClick={() => void finish(answers({ ...draft, note: "" }))} className={GHOST}>
                    {t("qualify.skipNote")}
                  </button>
                  <button type="button" disabled={pending} onClick={() => void finish(answers(draft))} className={PRIMARY}>
                    {t("qualify.save")}
                  </button>
                </div>
              </>
            ) : null}

            {error ? <p className="text-[12.5px] text-orange-ink">{error}</p> : null}

            <div aria-hidden className="mt-auto flex justify-center gap-1.5">
              {[0, 1, 2, 3].map((k) => (
                <i key={k} className={`size-1.5 rounded-full ${k <= step ? "bg-ink" : "bg-line"}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button type="button" disabled={pending} onClick={() => void finish(null)} className="text-[13px] font-semibold text-blue hover:underline">
          {t("qualify.skipPlace")}
        </button>
      </div>
    </div>
  );
}
