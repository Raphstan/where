"use client";

import Link from "next/link";
import { useState } from "react";
import {
  FEEDBACK_CONTEXTS,
  FEEDBACK_TEXT,
  NOT_VISITED,
  RATINGS,
  RECOMMEND_ANSWERS,
  type DueFollowup,
  type Feedback,
  type Rating,
  type RecommendAnswer,
} from "@/lib/booking/followup";
import { WhereBubble } from "@/components/chat/bubbles";

const CHIP =
  "inline-flex items-center rounded-full border-[1.5px] border-line bg-cream-2 px-3.5 py-[9px] text-[13.5px] font-semibold text-ink transition-colors hover:border-ink disabled:cursor-default disabled:opacity-50";
const ACTION = "inline-flex min-h-9 items-center rounded-full px-3.5 text-[13px] font-bold transition-colors";

type Stage = "rating" | "recommend" | "context" | "thanks" | "not-visited";

async function send(url: string, method: "POST" | "PATCH", body: unknown): Promise<void> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) {
    const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(json?.error?.message || "Ton retour n’est pas parti. Réessaie dans un instant.");
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
      await send(`/api/followups/${followup.id}`, "POST", feedback);
      setStage(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ton retour n’est pas parti. Réessaie dans un instant.");
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
      await send(`/api/followups/${followup.id}`, "PATCH", { shared: next });
      onToast(next ? FEEDBACK_TEXT.shared : FEEDBACK_TEXT.kept);
    } catch {
      setShared(!next);
      onToast("Je n’arrive pas à modifier le partage.");
    }
  }

  const q = FEEDBACK_TEXT.rating(followup.placeName);
  const thanks = FEEDBACK_TEXT.thanks(recommend === "Absolument");

  return (
    <div className="flex flex-col gap-2.5">
      <WhereBubble>
        {stage === "rating" ? (
          <>
            <div className="mb-2.5">
              {q.before}
              <b>{q.strong}</b>
              {q.after}
            </div>
            <div className="flex flex-wrap gap-2">
              {RATINGS.map((r) => (
                <button key={r} type="button" disabled={pending} onClick={() => pickRating(r)} className={CHIP}>
                  {r}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {stage === "recommend" ? (
          <>
            <div className="mb-2 text-[12.5px] text-muted">
              {followup.placeName} · {rating}
            </div>
            <div className="mb-2.5">{FEEDBACK_TEXT.recommend}</div>
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
                  {r}
                </button>
              ))}
            </div>
          </>
        ) : null}

        {stage === "context" ? (
          <>
            <div className="mb-2.5">{FEEDBACK_TEXT.context}</div>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_CONTEXTS.map((c) => (
                <button key={c} type="button" disabled={pending} onClick={() => pickContext(c)} className={CHIP}>
                  {c}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => pickContext(null)}
              className="mt-2 text-[12.5px] font-semibold text-blue hover:underline"
            >
              {FEEDBACK_TEXT.skip}
            </button>
          </>
        ) : null}

        {stage === "thanks" ? (
          <>
            <div>
              {thanks.before}
              <b>{thanks.strong}</b>
              {thanks.after}
            </div>
            <div className="flex items-center justify-between gap-3 pt-2.5">
              <span className="text-[12.5px] text-muted">{FEEDBACK_TEXT.share}</span>
              <button
                type="button"
                role="switch"
                aria-checked={shared}
                aria-label={FEEDBACK_TEXT.share}
                onClick={() => void toggleShare()}
                className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors ${shared ? "bg-olive" : "bg-line"}`}
              >
                <span
                  className={`absolute top-[3px] size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[left] ${shared ? "left-[21px]" : "left-[3px]"}`}
                />
              </button>
            </div>
            <p className="text-[11.5px] text-soft">{FEEDBACK_TEXT.shareNote}</p>
          </>
        ) : null}

        {stage === "not-visited" ? <div>{FEEDBACK_TEXT.notVisited}</div> : null}

        {error ? <p className="mt-2 text-[12.5px] text-[#a4402c]">{error}</p> : null}
      </WhereBubble>

      {stage === "thanks" ? (
        <div className="flex flex-wrap gap-2">
          <Link href="/memory" className={`${ACTION} bg-sand-2 text-ink hover:bg-sand`}>
            {FEEDBACK_TEXT.memory}
          </Link>
          <button type="button" onClick={onNewQuestion} className={`${ACTION} bg-ink text-cream hover:bg-[#0f1722]`}>
            {FEEDBACK_TEXT.newQuestion}
          </button>
        </div>
      ) : null}
    </div>
  );
}
