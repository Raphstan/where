"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { EXAMPLE_QUESTIONS } from "@/lib/ask/examples";
import type { AskRequest, AskResponse, Criteria, Understanding } from "@/lib/ask/schema";
import type { StoredConversation } from "@/lib/conversations/load";
import type { ReplySummary } from "@/lib/conversations/schema";
import { askedText } from "@/lib/network/message";
import { looselyEqual, withoutTag, withTag } from "@/lib/search/match";
import type { SearchResponse } from "@/lib/search/types";
import { ResultCard } from "@/components/results/result-card";
import { usePanel } from "@/components/shell/panel-context";
import { Notice, TypingBubble, UserBubble, WhereBubble } from "./bubbles";
import { ChoiceBubble } from "./choice";
import { Composer } from "./composer";
import { CriteriaChips } from "./criteria-chips";
import type { ChatMessage } from "./messages";
import { PeopleSuggestion } from "./people";

const TYPING_DELAY_MS = 450;
/** Fréquence de vérification des réponses du cercle, tant qu'une demande est en cours. */
const REPLIES_POLL_MS = 10_000;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type NewMessage = DistributiveOmit<ChatMessage, "id">;

const normalize = (tag: string) => tag.trim().toLocaleLowerCase("fr");

async function call<T>(
  url: string,
  init: { method: "GET" | "POST" | "PATCH"; body?: unknown },
  ok: (json: unknown) => json is T,
  fallback: string,
): Promise<T> {
  const res = await fetch(url, {
    method: init.method,
    headers: init.body === undefined ? undefined : { "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const json: unknown = res.status === 204 ? {} : await res.json().catch(() => null);
  if (res.ok && ok(json)) return json;
  const message = (json as { error?: { message?: string } } | null)?.error?.message;
  throw new Error(message || fallback);
}

const isObject = (json: unknown): json is Record<string, unknown> => typeof json === "object" && json !== null;
const isAskResponse = (json: unknown): json is AskResponse => isObject(json) && "understanding" in json;
const isSearchResponse = (json: unknown): json is SearchResponse => isObject(json) && "results" in json && "intro" in json;
const isCreated = (json: unknown): json is { id: string } => isObject(json) && typeof json.id === "string";
const isReplies = (json: unknown): json is { replies: ReplySummary[] } => isObject(json) && Array.isArray(json.replies);

async function ask(body: AskRequest): Promise<Understanding> {
  const json = await call("/api/ask", { method: "POST", body }, isAskResponse, "Je n’ai pas réussi à comprendre la question. Réessaie dans un instant.");
  return json.understanding;
}

function searchPlaces(criteria: Criteria, conversationId: string | null): Promise<SearchResponse> {
  return call(
    "/api/search",
    { method: "POST", body: { criteria, conversationId } },
    isSearchResponse,
    "Je n’arrive pas à chercher dans ton cercle. Réessaie dans un instant.",
  );
}

export function ChatScreen({ initial }: { initial?: StoredConversation }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState<string | null>(initial?.question ?? null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(initial?.id ?? null);
  const [watching, setWatching] = useState(Boolean(initial?.asked.length));
  const { close: closePanel } = usePanel();
  const nextId = useRef(1);
  /* Modifications manuelles des critères, à conserver quand le serveur renvoie une nouvelle compréhension. */
  const removedTags = useRef(new Set<string>());
  const addedTags = useRef<string[]>([]);
  /* Critères et chips courants (après retraits et ajouts manuels), et la dernière recherche affichée. */
  const criteria = useRef<Criteria | null>(initial?.criteria ?? null);
  const tags = useRef<string[]>(initial?.tags ?? []);
  const conversation = useRef<string | null>(initial?.id ?? null);
  const questionRef = useRef<string | null>(initial?.question ?? null);
  const seenReplies = useRef(new Set(initial?.replies.map((r) => r.id) ?? []));
  const lastSearch = useRef(0);
  const searched = useRef(false);
  const started = useRef(false);
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

  /** Enregistre la conversation (ou ses nouveaux critères) pour pouvoir y revenir quand un proche répond. */
  async function persist(current: Criteria): Promise<string | null> {
    try {
      if (conversation.current) {
        await call(
          `/api/conversations/${conversation.current}`,
          { method: "PATCH", body: { criteria: current, tags: tags.current } },
          isObject,
          "",
        );
        return conversation.current;
      }
      if (!questionRef.current) return null;
      const { id } = await call(
        "/api/conversations",
        { method: "POST", body: { question: questionRef.current, criteria: current, tags: tags.current } },
        isCreated,
        "",
      );
      conversation.current = id;
      setConversationId(id);
      window.history.replaceState(null, "", `/chat/${id}`);
      return id;
    } catch {
      // La recherche reste possible ; seule la demande au réseau en dépend.
      return conversation.current;
    }
  }

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
      tags.current = applyManualEdits(understanding.tags);
      push({ kind: "criteria", tags: tags.current });
      criteria.current = applyCriteriaEdits(understanding.criteria);
      if (understanding.clarification) {
        push({ kind: "choice", clarification: understanding.clarification, picked: null });
        setBusy(false);
      } else {
        await runSearch(criteria.current, { save: true });
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
  async function runSearch(current: Criteria, opts: { save: boolean }): Promise<SearchResponse | null> {
    setBusy(true);
    searched.current = true;
    const previous = lastSearch.current;
    const search = ++lastSearch.current;
    setMessages((prev) => prev.filter((m) => !("search" in m && m.search === previous)));
    const typingId = push({ kind: "typing", search });
    try {
      const id = opts.save ? await persist(current) : conversation.current;
      const response = await searchPlaces(current, id);
      if (lastSearch.current !== search) return null; // Une recherche plus récente a pris le relais.
      remove(typingId);
      push({ kind: "where", parts: response.intro, search });
      if (response.results.length > 0) push({ kind: "results", results: response.results, search });
      if (response.after) push({ kind: "notice", tone: "info", icon: "🧭", text: response.after, search });
      if (response.askIntro) push({ kind: "where", parts: response.askIntro, search });
      if (response.people.length > 0) push({ kind: "people", people: response.people, search });
      return response;
    } catch (error) {
      remove(typingId);
      push({
        kind: "notice",
        tone: "warn",
        text: error instanceof Error ? error.message : "Quelque chose a coincé. Réessaie dans un instant.",
        search,
      });
      return null;
    } finally {
      if (lastSearch.current === search) setBusy(false);
    }
  }

  /* Conversation rechargée (/chat/[id]) : on rejoue la question, les demandes, puis la recherche. */
  useEffect(() => {
    if (!initial || started.current) return;
    started.current = true;
    push({ kind: "user", text: initial.question });
    push({ kind: "criteria", tags: initial.tags });
    for (const a of initial.asked) {
      if (a.sentTo.length > 0) push({ kind: "asked", names: a.sentTo });
    }
    for (const r of initial.replies) {
      push({ kind: "notice", tone: "coral", strong: `${r.memberName} a répondu`, text: ` : ${r.placeName}.` });
    }
    void runSearch(initial.criteria, { save: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois, au chargement
  }, []);

  /* Réponses du cercle : vérifiées régulièrement tant que la page est visible. */
  useEffect(() => {
    if (!watching || !conversationId) return;
    let stopped = false;
    async function check() {
      if (stopped || document.visibilityState !== "visible" || !conversationId) return;
      let replies: ReplySummary[];
      try {
        ({ replies } = await call(`/api/conversations/${conversationId}/replies`, { method: "GET" }, isReplies, ""));
      } catch {
        return;
      }
      const fresh = replies.filter((r) => !seenReplies.current.has(r.id));
      if (fresh.length === 0 || stopped) return;
      for (const r of fresh) seenReplies.current.add(r.id);

      const noticeIds = fresh.map((r) =>
        push({ kind: "notice", tone: "coral", strong: `${r.memberName} vient de répondre.`, text: "" }),
      );
      for (const r of fresh.filter((x) => !x.reusable)) {
        push({
          kind: "notice",
          tone: "soft",
          text: `${r.memberName} n’a pas autorisé la réutilisation : cette réponse ne sert qu’à cette question et ne sera pas gardée.`,
        });
      }
      if (!criteria.current) return;
      const response = await runSearch(criteria.current, { save: false });
      const top = response?.results[0];
      if (!top) return;
      // Le nouveau n°1 vient d'une de ces réponses : la phrase de la maquette dit exactement cela.
      fresh.forEach((r, i) => {
        if (looselyEqual(top.name, r.placeName)) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === noticeIds[i] && m.kind === "notice"
                ? { ...m, text: " J’ai une nouvelle recommandation plus fiable — sa réponse change le classement." }
                : m,
            ),
          );
        }
      });
    }
    const timer = setInterval(() => void check(), REPLIES_POLL_MS);
    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- push et runSearch lisent des refs
  }, [watching, conversationId]);

  function applyCriteriaEdits(c: Criteria): Criteria {
    let out = c;
    for (const removed of removedTags.current) out = withoutTag(out, removed);
    for (const added of addedTags.current) out = withTag(out, added);
    return out;
  }

  function applyManualEdits(list: string[]): string[] {
    const kept = list.filter((t) => !removedTags.current.has(normalize(t)));
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
    questionRef.current = text;
    removedTags.current = new Set();
    addedTags.current = [];
    criteria.current = null;
    tags.current = [];
    searched.current = false;
    // Nouvelle question, nouvelle conversation : les résultats précédents restent affichés.
    conversation.current = null;
    setConversationId(null);
    setWatching(false);
    lastSearch.current += 1;
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
    const current = messages.find((m) => m.id === id);
    const label = current?.kind === "criteria" ? current.tags[index] : undefined;
    if (!label) return;
    setMessages((prev) =>
      prev.map((m) => (m.id === id && m.kind === "criteria" ? { ...m, tags: m.tags.filter((_, i) => i !== index) } : m)),
    );
    removedTags.current.add(normalize(label));
    addedTags.current = addedTags.current.filter((t) => normalize(t) !== normalize(label));
    tags.current = tags.current.filter((t) => normalize(t) !== normalize(label));
    if (criteria.current) criteria.current = withoutTag(criteria.current, label);
    if (criteria.current && searched.current && !busy) {
      showToast(`« ${label} » retiré — je mets les résultats à jour`);
      void runSearch(criteria.current, { save: true });
    } else {
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
    if (!tags.current.some((t) => normalize(t) === normalize(tag))) tags.current = [...tags.current, tag];
    if (criteria.current) criteria.current = withTag(criteria.current, tag);
    if (criteria.current && searched.current && !busy) {
      showToast(`« ${tag} » ajouté — résultats mis à jour`);
      void runSearch(criteria.current, { save: true });
    } else {
      showToast(`« ${tag} » ajouté`);
    }
  }

  function reset() {
    closePanel();
    // Une conversation enregistrée a sa propre adresse : on repart de /chat.
    if (window.location.pathname !== "/chat" || conversation.current) {
      router.push("/chat");
      return;
    }
    setMessages([]);
    setQuestion(null);
    questionRef.current = null;
    setBusy(false);
    removedTags.current = new Set();
    addedTags.current = [];
    criteria.current = null;
    tags.current = [];
    searched.current = false;
    lastSearch.current += 1; // Ignore une recherche encore en vol.
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
                    {m.strong ? <b>{m.strong}</b> : null}
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
            case "people":
              return (
                <div key={m.id} className="mx-auto w-full max-w-[760px]">
                  <PeopleSuggestion
                    people={m.people.filter((p) => p.relevant)}
                    askHref={conversationId ? `/chat/${conversationId}/ask` : null}
                  />
                </div>
              );
            case "asked": {
              const t = askedText(m.names);
              return (
                <div key={m.id} className="mx-auto w-full max-w-[760px]">
                  <WhereBubble>
                    Envoyé à <b>{t.strong}</b>
                    {t.text}
                  </WhereBubble>
                </div>
              );
            }
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
