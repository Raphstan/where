"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EXAMPLE_QUESTIONS } from "@/lib/ask/examples";
import type { AskRequest, AskResponse, Understanding } from "@/lib/ask/schema";
import { Notice, TypingBubble, UserBubble, WhereBubble } from "./bubbles";
import { ChoiceBubble } from "./choice";
import { Composer } from "./composer";
import { CriteriaChips } from "./criteria-chips";
import { ENDING_TEXT, type ChatMessage } from "./messages";

const TYPING_DELAY_MS = 450;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type NewMessage = DistributiveOmit<ChatMessage, "id">;

const normalize = (tag: string) => tag.trim().toLocaleLowerCase("fr");

async function ask(body: AskRequest): Promise<Understanding> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => null)) as AskResponse | { error?: { message?: string } } | null;
  if (!res.ok || !json || !("understanding" in json)) {
    const message =
      json && "error" in json && json.error?.message
        ? json.error.message
        : "Je n’ai pas réussi à comprendre la question. Réessaie dans un instant.";
    throw new Error(message);
  }
  return json.understanding;
}

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const nextId = useRef(1);
  /* Modifications manuelles des critères, à conserver quand le serveur renvoie une nouvelle compréhension. */
  const removedTags = useRef(new Set<string>());
  const addedTags = useRef<string[]>([]);
  const bottom = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((m: NewMessage) => {
    const id = nextId.current++;
    setMessages((prev) => [...prev, { ...m, id } as ChatMessage]);
    return id;
  }, []);

  const remove = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  async function runAsk(body: AskRequest) {
    setBusy(true);
    const typingId = push({ kind: "typing" });
    try {
      // Laisse l'indicateur « réfléchit » visible au moins un court instant, comme la maquette.
      const [understanding] = await Promise.all([
        ask(body),
        new Promise<void>((resolve) => setTimeout(resolve, TYPING_DELAY_MS)),
      ]);
      remove(typingId);
      push({ kind: "criteria", tags: applyManualEdits(understanding.tags) });
      if (understanding.clarification) {
        push({ kind: "choice", clarification: understanding.clarification, picked: null });
      } else {
        push({ kind: "where", text: ENDING_TEXT });
      }
    } catch (error) {
      remove(typingId);
      push({
        kind: "notice",
        tone: "warn",
        text: error instanceof Error ? error.message : "Quelque chose a coincé. Réessaie dans un instant.",
      });
    } finally {
      setBusy(false);
    }
  }

  function applyManualEdits(tags: string[]): string[] {
    const kept = tags.filter((t) => !removedTags.current.has(normalize(t)));
    const known = new Set(kept.map(normalize));
    for (const added of addedTags.current) {
      if (!known.has(normalize(added))) {
        kept.push(added);
        known.add(normalize(added));
      }
    }
    return kept;
  }

  function send(text: string) {
    if (busy) return;
    setQuestion(text);
    removedTags.current = new Set();
    addedTags.current = [];
    push({ kind: "user", text });
    void runAsk({ question: text });
  }

  function pick(id: number, option: string) {
    if (busy || !question) return;
    let clarificationQuestion: string | null = null;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === id && m.kind === "choice" && m.picked === null) {
          clarificationQuestion = m.clarification.question;
          return { ...m, picked: option };
        }
        return m;
      }),
    );
    const current = messages.find((m) => m.id === id);
    const q = clarificationQuestion ?? (current?.kind === "choice" ? current.clarification.question : null);
    if (!q) return;
    void runAsk({ question, clarification: { question: q, answer: option } });
  }

  function removeTag(id: number, index: number) {
    let removed: string | null = null;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== id || m.kind !== "criteria") return m;
        removed = m.tags[index] ?? null;
        return { ...m, tags: m.tags.filter((_, i) => i !== index) };
      }),
    );
    const current = messages.find((m) => m.id === id);
    const label = removed ?? (current?.kind === "criteria" ? current.tags[index] : null);
    if (label) {
      removedTags.current.add(normalize(label));
      addedTags.current = addedTags.current.filter((t) => normalize(t) !== normalize(label));
      showToast(`« ${label} » retiré`);
    }
  }

  function addTag(id: number, tag: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id && m.kind === "criteria" && !m.tags.some((t) => normalize(t) === normalize(tag))
          ? { ...m, tags: [...m.tags, tag] }
          : m,
      ),
    );
    removedTags.current.delete(normalize(tag));
    if (!addedTags.current.some((t) => normalize(t) === normalize(tag))) addedTags.current.push(tag);
    showToast(`« ${tag} » ajouté`);
  }

  function reset() {
    setMessages([]);
    setQuestion(null);
    setBusy(false);
    removedTags.current = new Set();
    addedTags.current = [];
  }

  const empty = messages.length === 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {!empty ? (
        <div className="flex shrink-0 justify-end px-[18px] pb-1 lg:px-9 lg:pt-4">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-[30px] items-center rounded-full border-[1.5px] border-line px-[11px] text-[12.5px] font-semibold text-ink transition-colors hover:border-ink"
          >
            Nouveau
          </button>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 pt-2 pb-4 lg:px-9 lg:pt-6">
        {empty ? (
          <div className="my-auto flex flex-col items-center gap-3.5 px-2.5 pt-8 pb-2.5 text-center">
            <span
              aria-hidden
              className="inline-flex size-[52px] items-center justify-center rounded-full bg-coral font-display text-[20px] font-medium text-white"
            >
              W
            </span>
            <h1 className="font-display text-[21px] font-medium leading-tight">Où devrais-tu vraiment aller ?</h1>
            <p className="max-w-[360px] text-[12.5px] text-muted">
              Pose ta question comme à un ami. Je regarde d’abord ce que ton cercle sait, puis je complète
              avec le public.
            </p>
          </div>
        ) : null}

        {messages.map((m) => {
          switch (m.kind) {
            case "user":
              return (
                <div key={m.id} className="mx-auto w-full max-w-[760px]">
                  <UserBubble>{m.text}</UserBubble>
                </div>
              );
            case "typing":
              return (
                <div key={m.id} className="mx-auto w-full max-w-[760px]">
                  <TypingBubble />
                </div>
              );
            case "criteria":
              return (
                <div key={m.id} className="mx-auto w-full max-w-[760px]">
                  <CriteriaChips
                    tags={m.tags}
                    onRemove={(i) => removeTag(m.id, i)}
                    onAdd={(tag) => addTag(m.id, tag)}
                  />
                </div>
              );
            case "choice":
              return (
                <div key={m.id} className="mx-auto w-full max-w-[760px]">
                  <ChoiceBubble
                    clarification={m.clarification}
                    picked={m.picked}
                    onPick={(option) => pick(m.id, option)}
                  />
                </div>
              );
            case "where":
              return (
                <div key={m.id} className="mx-auto w-full max-w-[760px]">
                  <WhereBubble>{m.text}</WhereBubble>
                </div>
              );
            case "notice":
              return (
                <div key={m.id} className="mx-auto w-full max-w-[760px]">
                  <Notice tone={m.tone}>{m.text}</Notice>
                </div>
              );
          }
        })}
        <div ref={bottom} />
      </div>

      {empty ? (
        <div className="flex shrink-0 gap-2 overflow-x-auto px-3.5 pb-2.5 [scrollbar-width:none] lg:flex-wrap lg:justify-center lg:px-9 lg:pb-2">
          {EXAMPLE_QUESTIONS.map((ex) => (
            <button
              key={ex.key}
              type="button"
              onClick={() => send(ex.text)}
              className="inline-flex shrink-0 items-center rounded-full border-[1.5px] border-line bg-cream-2 px-3 py-[7px] text-[12.5px] font-medium whitespace-nowrap text-ink transition-colors hover:border-ink"
            >
              {ex.text}
            </button>
          ))}
        </div>
      ) : null}

      <Composer disabled={busy} onSend={send} />

      {toast ? (
        <div
          role="status"
          className="absolute bottom-[92px] left-1/2 z-10 max-w-[90%] -translate-x-1/2 animate-pop truncate rounded-full bg-ink px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap text-cream lg:bottom-24"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
