"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";
import {
  contextLabel,
  FEEDBACK_CONTEXTS,
  NOT_VISITED,
  ratingLabel,
  recommendLabel,
  RATINGS,
  RECOMMEND_ANSWERS,
  type DueFollowup,
  type Feedback,
  type Rating,
  type RecommendAnswer,
} from "@/lib/booking/followup";
import { WhereBubble } from "@/components/chat/bubbles";

const CHIP =
  "inline-flex items-center rounded-full border-[1.5px] border-line bg-paper-2 px-3.5 py-[9px] text-[13.5px] font-semibold text-ink transition-colors hover:border-ink disabled:cursor-default disabled:opacity-50";
const ACTION = "inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-bold transition-colors";

type Stage = "rating" | "recommend" | "context" | "thanks" | "not-visited";

async function send(url: string, method: "POST" | "PATCH", body: unknown, fallback: string): Promise<void> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(json?.error?.message || fallback);
  }
}

/**
 * Retour après visite, le lendemain (docs/prototype.html, feedbackMsg) : « Alors, {Lieu} ? »
 * → « Tu le recommanderais à quelqu’un ? » → « Pour quel contexte ? ». Enregistré comme `visited`
 * ou `recommended` ; « Je n’y suis finalement pas allé » n'enregistre aucune visite.
 */
export function FeedbackBubble({
  followup,
  onNewQuestion,
  onToast,
}: {
  followup: DueFollowup;
  onNewQuestion: () => void;
  onToast: (text: string) => void;
}) {
  const t = useTranslations("booking");
  const [stage, setStage] = useState<Stage>("rating");
  const [rating, setRating] = useState<Rating | null>(null);
  const [recommend, setRecommend] = useState<RecommendAnswer | null>(null);
  const [shared, setShared] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(feedback: Feedback, next: Stage) {
    setPending(true);
    setError(null);
    try {
      await send(`/api/followups/${followup.id}`, "POST", feedback, t("feedback.sendFailed"));
      setStage(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("feedback.sendFailed"));
    } finally {
      setPending(false);
    }
  }

  function pickRating(r: Rating) {
    setRating(r);
    if (r === NOT_VISITED) void submit({ rating: r, recommend: null, occasion: [] }, "not-visited");
    else setStage("recommend");
  }

  function pickContext(context: (typeof FEEDBACK_CONTEXTS)[number] | null) {
    if (!rating || !recommend) return;
    void submit({ rating, recommend, occasion: context ? [context] : [] }, "thanks");
  }

  async function toggleShare() {
    const next = !shared;
    setShared(next);
    try {
      await send(`/api/followups/${followup.id}`, "PATCH", { shared: next }, t("feedback.shareFailed"));
      onToast(next ? t("feedback.shared") : t("feedback.kept"));
    } catch {
      setShared(!next);
      onToast(t("feedback.shareFailed"));
    }
  }

  const bold = (chunks: ReactNode) => <b>{chunks}</b>;

  return (
    <div className="flex flex-col gap-2.5">
      <WhereBubble>
        {stage === "rating" ? (
          <>
            <div className="mb-2.5">{t.rich("feedback.rating", { place: followup.placeName, b: bold })}</div>
            <div className="flex flex-wrap gap-2">
              {RATINGS.map((r) => (
                <button key={r} type="button" disabled={pending} onClick={() => pickRating(r)} className={CHIP}>
                  {ratingLabel(t, r)}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {stage === "recommend" ? (
          <>
            <div className="mb-2 text-[12.5px] text-muted">
              {followup.placeName} · {rating ? ratingLabel(t, rating) : null}
            </div>
            <div className="mb-2.5">{t("feedback.recommend")}</div>
            <div className="flex flex-wrap gap-2">
              {RECOMMEND_ANSWERS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setRecommend(r);
                    setStage("context");
                  }}
                  className={CHIP}
                >
                  {recommendLabel(t, r)}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {stage === "context" ? (
          <>
            <div className="mb-2.5">{t("feedback.context")}</div>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_CONTEXTS.map((c) => (
                <button key={c} type="button" disabled={pending} onClick={() => pickContext(c)} className={CHIP}>
                  {contextLabel(t, c)}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => pickContext(null)}
              className="mt-2 text-[12.5px] font-semibold text-blue hover:underline"
            >
              {t("feedback.skip")}
            </button>
          </>
        ) : null}

        {stage === "thanks" ? (
          <>
            <div>{t.rich(recommend === "Absolument" ? "feedback.thanksRecommended" : "feedback.thanks", { b: bold })}</div>
            <div className="flex items-center justify-between gap-3 pt-2.5">
              <span className="text-[12.5px] text-muted">{t("feedback.share")}</span>
              <button
                type="button"
                role="switch"
                aria-checked={shared}
                aria-label={t("feedback.share")}
                onClick={() => void toggleShare()}
                className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors ${shared ? "bg-orange" : "bg-line-strong"}`}
              >
                <span
                  className={`absolute top-[3px] size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[inset-inline-start] ${shared ? "start-[21px]" : "start-[3px]"}`}
                />
              </button>
            </div>
            <p className="text-[11.5px] text-soft">{t("feedback.shareNote")}</p>
          </>
        ) : null}

        {stage === "not-visited" ? <div>{t("feedback.notVisited")}</div> : null}

        {error ? <p className="mt-2 text-[12.5px] text-orange-ink">{error}</p> : null}
      </WhereBubble>

      {stage === "thanks" ? (
        <div className="flex flex-wrap gap-2">
          <Link href="/memory" className={`${ACTION} bg-lilac-2 text-ink hover:bg-lilac`}>
            {t("feedback.memory")}
          </Link>
          <button type="button" onClick={onNewQuestion} className={`${ACTION} bg-ink text-paper hover:bg-night`}>
            {t("feedback.newQuestion")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
