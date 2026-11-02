"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import type { SuggestResponse } from "@/app/api/guest/suggest/route";
import { Wordmark } from "@/components/shell/wordmark";
import type { PlaceSuggestion } from "@/lib/google/autocomplete";
import { sendGuestReply, type GuestReplyState } from "./actions";
import { GuestMemoryPanel } from "./guest-memory";

const INPUT =
  "w-full rounded-[12px] border-[1.5px] border-line bg-paper-2 px-3.5 py-[11px] text-[14px] text-ink outline-none placeholder:text-soft focus:border-ink";

const URL_RE = /^https?:\/\/\S+$/i;

/**
 * Suggestions Google pendant la frappe (300 ms après la dernière touche, à partir de 3 lettres).
 * Liste vide si Google ne répond pas ou si le budget est épuisé : le texte tapé reste utilisable.
 */
function useSuggestions(token: string, query: string, enabled: boolean) {
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [settled, setSettled] = useState("");
  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/guest/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, q }),
        signal: controller.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<SuggestResponse>) : { suggestions: [] }))
        .then((r) => {
          setItems(r.suggestions);
          setSettled(q);
        })
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [token, query, enabled]);
  // Suggestions d'une frappe précédente : masquées tant que la nouvelle n'est pas arrivée.
  return enabled && query.trim().length >= 3 && settled.length > 0 ? items : [];
}

/**
 * Formulaire de la page invité. Depuis le premier test réel (2026-11-02) : un seul champ pour le
 * lieu (suggestions Google, ou lien collé), un mot facultatif, « Je n'y suis pas encore allé·e »,
 * et le prénom quand on ne le connaît pas. Cinq secondes, pas un formulaire.
 * `memberName` null : lien d'invitation, le proche donne son prénom.
 */
export function GuestForm({ token, memberName, requester }: { token: string; memberName: string | null; requester: string }) {
  const t = useTranslations("guest");
  const [state, action, pending] = useActionState<GuestReplyState, FormData>(sendGuestReply, { status: "idle" });
  const [another, setAnother] = useState<number | null>(null);
  // Champs contrôlés : une action de formulaire React réinitialise les champs non contrôlés.
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<PlaceSuggestion | null>(null);
  const [placeUrl, setPlaceUrl] = useState("");
  const [note, setNote] = useState("");
  const [notYet, setNotYet] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [showNote, setShowNote] = useState(false);
  const askName = memberName === null && another === null;
  const name = memberName ?? guestName.trim();
  const suggestions = useSuggestions(token, query, picked === null);
  const searchRef = useRef<HTMLInputElement>(null);

  function reset() {
    setQuery("");
    setPicked(null);
    setPlaceUrl("");
    setNote("");
    setNotYet(false);
    setShowNote(false);
  }

  function onQuery(value: string) {
    // Un lien Instagram, TikTok ou d'un site : on le garde à part et on demande le nom du lieu.
    // Un lien Google Maps reste dans le champ : le serveur en tire le lieu et le propose.
    if (URL_RE.test(value.trim()) && !/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(value)) {
      setPlaceUrl(value.trim());
      setQuery("");
      return;
    }
    setQuery(value);
  }

  if (state.status === "sent" && another !== state.at) {
    return (
      <div className="flex animate-up flex-col gap-3">
        <div className="flex items-center">
          <Wordmark className="text-[16px]" />
          <span className="ms-auto rounded-full bg-olive-2 px-[9px] py-1 text-[11.5px] font-bold text-olive">
            {t("sentTo", { requester })}
          </span>
        </div>
        <h2 className="font-display text-[21px] font-bold leading-tight">{t("thanks", { name })}</h2>
        <p className="text-[12.5px] text-muted">
          {state.reusable ? t("reusableYes", { requester }) : t("reusableNo", { requester })}
        </p>
        <GuestMemoryPanel token={token} requester={requester} />
        <button
          type="button"
          onClick={() => {
            setAnother(state.at);
            reset();
          }}
          className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-lilac-2 px-5 text-[14.5px] font-bold text-ink transition-colors hover:bg-lilac"
        >
          {t("another")}
        </button>
      </div>
    );
  }

  const isMapsLink = URL_RE.test(query.trim());
  const placeName = picked?.name ?? (isMapsLink ? "" : query.trim());

  return (
    <form action={action} className="flex flex-col gap-3" key={another ?? 0}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="placeName" value={placeName} />
      <input type="hidden" name="placeUrl" value={placeUrl} />
      <input type="hidden" name="googlePlaceId" value={picked?.googlePlaceId ?? ""} />
      <input type="hidden" name="placeAddress" value={picked?.address ?? ""} />
      <input type="hidden" name="placeCity" value={picked?.city ?? ""} />
      <input type="hidden" name="notYet" value={notYet ? "1" : "0"} />

      {picked ? (
        <div className="flex items-center gap-3 rounded-[12px] border-[1.5px] border-ink bg-paper-2 px-3.5 py-2.5">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-[15px] font-bold">{picked.name}</span>
            {picked.address ? <span className="block truncate text-[12.5px] text-muted">{picked.address}</span> : null}
          </span>
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setTimeout(() => searchRef.current?.focus(), 0);
            }}
            className="shrink-0 text-[12.5px] font-semibold text-blue underline-offset-4 hover:underline"
          >
            {t("change")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            maxLength={500}
            autoComplete="off"
            enterKeyHint="done"
            placeholder={placeUrl ? t("placeName") : t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className={INPUT}
          />
          {suggestions.length > 0 ? (
            <ul className="overflow-hidden rounded-[12px] border-[1.5px] border-line bg-paper-2" aria-label={t("suggestions")}>
              {suggestions.map((s) => (
                <li key={s.googlePlaceId} className="border-b border-line last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      setPicked(s);
                      setQuery("");
                    }}
                    className="block w-full px-3.5 py-2.5 text-start hover:bg-lilac-2"
                  >
                    <span className="block truncate text-[14px] font-semibold">{s.name}</span>
                    {s.address ? <span className="block truncate text-[12px] text-muted">{s.address}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {placeUrl ? (
            <p className="flex items-center gap-2 text-[12px] text-muted">
              <span className="min-w-0 truncate">{t("linkAdded", { link: placeUrl.replace(/^https?:\/\//, "") })}</span>
              <button type="button" onClick={() => setPlaceUrl("")} className="shrink-0 font-semibold text-blue">
                {t("removeLink")}
              </button>
            </p>
          ) : null}
        </div>
      )}

      <label className="flex items-center gap-2.5 text-[13px] text-ink-2">
        <input
          type="checkbox"
          checked={notYet}
          onChange={(e) => setNotYet(e.target.checked)}
          className="size-[18px] shrink-0 accent-orange"
        />
        {t("notYet")}
      </label>

      {showNote || note ? (
        <textarea
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={600}
          autoFocus
          placeholder={t("note")}
          aria-label={t("note")}
          className={`${INPUT} min-h-[72px] resize-none rounded-[14px]`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowNote(true)}
          className="self-start text-[13px] font-semibold text-blue underline-offset-4 hover:underline"
        >
          {t("addNote")}
        </button>
      )}

      {askName ? (
        <input
          name="guestName"
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          required
          maxLength={60}
          autoComplete="given-name"
          placeholder={t("yourName")}
          aria-label={t("yourName")}
          className={INPUT}
        />
      ) : null}

      {state.status === "error" ? (
        <p role="alert" className="rounded-[14px] bg-amber-2 px-3.5 py-3 text-[13.5px] text-[#6e4f14]">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || placeName.length < 2}
        className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-orange px-5 text-[14.5px] font-bold text-white shadow-orange transition-colors hover:bg-[#ee4a10] disabled:opacity-60"
      >
        {t("submit")}
      </button>
      <p className="text-center text-[11.5px] text-soft">{t("privateTo", { requester })}</p>
    </form>
  );
}
