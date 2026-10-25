"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EXAMPLE_QUESTIONS } from "@/lib/ask/examples";
import type { AskRequest, AskResponse, Criteria, Understanding } from "@/lib/ask/schema";
import { withoutTag, withTag } from "@/lib/search/match";
import type { SearchResponse } from "@/lib/search/types";
import { ResultCard } from "@/components/results/result-card";
import { usePanel } from "@/components/shell/panel-context";
import { Notice, TypingBubble, UserBubble, WhereBubble } from "./bubbles";
import { ChoiceBubble } from "./choice";
import { Composer } from "./composer";
import { CriteriaChips } from "./criteria-chips";
import type { ChatMessage } from "./messages";

const TYPING_DELAY_MS = 450;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type NewMessage = DistributiveOmit<ChatMessage, "id">;

const normalize = (tag: string) => tag.trim().toLocaleLowerCase("fr");

async function post<T>(url: string, body: unknown, ok: (json: unknown) => json is T, fallback: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: unknown = await res.json().catch(() => null);
  if (res.ok && ok(json)) return json;
  const message = (json as { error?: { message?: string } } | null)?.error?.message;
  throw new Error(message || fallback);
}

const isAskResponse = (json: unknown): json is AskResponse =>
  typeof json === "object" && json !== null && "understanding" in json;
const isSearchResponse = (json: unknown): json is SearchResponse =>
  typeof json === "object" && json !== null && "results" in json && "intro" in json;

async function ask(body: AskRequest): Promise<Understanding> {
  const json = await post("/api/ask", body, isAskResponse, "Je n’ai pas réussi à comprendre la question. Réessaie dans un instant.");
  return json.understanding;
}

function searchPlaces(criteria: Criteria): Promise<SearchResponse> {
  return post("/api/search", { criteria }, isSearchResponse, "Je n’arrive pas à chercher dans ton cercle. Réessaie dans un instant.");
}

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { close: closePanel } = usePanel();
  const nextId = useRef(1);
  /* Modifications manuelles des critères, à conserver quand le serveur renvoie une nouvelle compréhension. */
  const removedTags = useRef(new Set<string>());
  const addedTags = useRef<string[]>([]);
  /* Critères courants (après retraits et ajouts manuels), et la dernière recherche affichée. */
  const criteria = useRef<Criteria | null>(null);
  const lastSearch = useRef(0);
  const searched = useRef(false);
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
      criteria.current = applyCriteriaEdits(understanding.criteria);
      if (understanding.clarification) {
        push({ kind: "choice", clarification: understanding.clarification, picked: null });
        setBusy(false);
      } else {
        await runSearch(criteria.current);
      }
    } catch (error) {
      remove(typingId);
      push({
        kind: "notice",
        tone: "warn",
        text: error instanceof Error ? error.message : "Quelque chose a coincé. Réessaie dans un instant.",
      });
      setBusy(false);
    }
  }

  /** Lance (ou relance) la recherche ; les messages de la recherche précédente sont remplacés. */
  async function runSearch(current: Criteria) {
    setBusy(true);
    searched.current = true;
    const previous = lastSearch.current;
    const search = ++lastSearch.current;
    setMessages((prev) => prev.filter((m) => !("search" in m && m.search === previous)));
    const typingId = push({ kind: "typing", search });
    try {
      const response = await searchPlaces(current);
      if (lastSearch.current !== search) return; // Une recherche plus récente a pris le relais.
      remove(typingId);
      push({ kind: "where", parts: response.intro, search });
      if (response.results.length > 0) push({ kind: "results", results: response.results, search });
      if (response.after) push({ kind: "notice", tone: "info", icon: "🧭", text: response.after, search });
    } catch (error) {
      remove(typingId);
      push({
        kind: "notice",
        tone: "warn",
        text: error instanceof Error ? error.message : "Quelque chose a coincé. Réessaie dans un instant.",
        search,
      });
    } finally {
      if (lastSearch.current === search) setBusy(false);
    }
  }

  function applyCriteriaEdits(c: Criteria): Criteria {
    let out = c;
    for (const removed of removedTags.current) out = withoutTag(out, removed);
    for (const added of addedTags.current) out = withTag(out, added);
    return out;
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
    criteria.current = null;
    searched.current = false;
    lastSearch.current += 1; // Les résultats de la question précédente restent dans la conversation.
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
      if (criteria.current) criteria.current = withoutTag(criteria.current, label);
      if (criteria.current && searched.current && !busy) {
        showToast(`« ${label} » retiré — je mets les résultats à jour`);
        void runSearch(criteria.current);
      } else {
        showToast(`« ${label} » retiré`);
      }
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
    if (criteria.current) criteria.current = withTag(criteria.current, tag);
    if (criteria.current && searched.current && !busy) {
      showToast(`« ${tag} » ajouté — résultats mis à jour`);
      void runSearch(criteria.current);
    } else {
      showToast(`« ${tag} » ajouté`);
    }
  }

  function reset() {
    setMessages([]);
    setQuestion(null);
    setBusy(false);
    removedTags.current = new Set();
    addedTags.current = [];
    criteria.current = null;
    searched.current = false;
    lastSearch.current += 1; // Ignore une recherche encore en vol.
    closePanel();
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
                  <WhereBubble>
                    {m.parts.map((p, i) => (p.strong ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>))}
                  </WhereBubble>
                </div>
              );
            case "notice":
              return (
                <div key={m.id} className="mx-auto w-full max-w-[760px]">
                  <Notice tone={m.tone} icon={m.icon}>
                    {m.text}
                  </Notice>
                </div>
              );
            case "results":
              return (
                <div key={m.id} className="mx-auto flex w-full max-w-[760px] animate-pop flex-col gap-2.5">
                  {m.results.map((r, i) => (
                    <ResultCard key={r.id} result={r} first={i === 0} />
                  ))}
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
