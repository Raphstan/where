"use client";

import { useActionState, useState } from "react";
import { sendGuestReply, type GuestReplyState } from "./actions";

const INPUT =
  "w-full rounded-[12px] border-[1.5px] border-line bg-cream-2 px-3.5 py-[11px] text-[14px] text-ink outline-none placeholder:text-soft focus:border-ink";

function Toggle({ name, label, defaultOn }: { name: string; label: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[12.5px] text-muted">{label}</span>
      <input type="hidden" name={name} value={on ? "1" : "0"} />
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className={`relative h-[26px] w-11 shrink-0 rounded-full transition-colors ${on ? "bg-olive" : "bg-line"}`}
      >
        <span
          className={`absolute top-[3px] size-5 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-[left] ${on ? "left-[21px]" : "left-[3px]"}`}
        />
      </button>
    </div>
  );
}

/** Formulaire de la page invité (docs/prototype.html, scrSarah). */
export function GuestForm({ token, memberName, requester }: { token: string; memberName: string; requester: string }) {
  const [state, action, pending] = useActionState<GuestReplyState, FormData>(sendGuestReply, { status: "idle" });
  const [visited, setVisited] = useState<"oui" | "non" | null>(null);
  const [another, setAnother] = useState<number | null>(null);
  // Champs contrôlés : une action de formulaire React réinitialise les champs non contrôlés.
  const [placeName, setPlaceName] = useState("");
  const [placeUrl, setPlaceUrl] = useState("");
  const [note, setNote] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  if (state.status === "sent" && another !== state.at) {
    return (
      <div className="flex animate-up flex-col gap-3">
        <div className="flex items-center">
          <span className="font-display tracking-[0.14em]">WHERE</span>
          <span className="ml-auto rounded-full bg-olive-2 px-[9px] py-1 text-[11.5px] font-bold text-olive">
            Envoyé à {requester}
          </span>
        </div>
        <h2 className="font-display text-[21px] font-medium leading-tight">Merci, {memberName}.</h2>
        <p className="text-[12.5px] text-muted">
          {state.reusable
            ? `Seul ${requester} voit ta réponse. Tu as autorisé WHERE à la réutiliser pour ${requester} à l’avenir.`
            : `Seul ${requester} voit ta réponse. Elle ne sert qu’à cette question et ne sera pas gardée.`}
        </p>
        <button
          type="button"
          onClick={() => {
            setAnother(state.at);
            setVisited(null);
            setPlaceName("");
            setPlaceUrl("");
            setNote("");
          }}
          className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-sand-2 px-5 text-[14.5px] font-bold text-ink transition-colors hover:bg-sand"
        >
          Recommander un autre lieu
        </button>
      </div>
    );
  }

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (visited === null) {
          e.preventDefault();
          setLocalError("Dis-moi si tu y es réellement allé·e.");
        }
      }}
      className="flex flex-col gap-3.5"
      key={another ?? 0}
    >
      <input type="hidden" name="token" value={token} />
      <input
        name="placeName"
        value={placeName}
        onChange={(e) => setPlaceName(e.target.value)}
        required
        minLength={2}
        maxLength={120}
        placeholder="Nom du lieu"
        aria-label="Nom du lieu"
        className={INPUT}
      />
      <input
        name="placeUrl"
        value={placeUrl}
        onChange={(e) => setPlaceUrl(e.target.value)}
        type="url"
        maxLength={500}
        placeholder="Lien Google Maps / Instagram / TikTok (facultatif)"
        aria-label="Lien Google Maps, Instagram ou TikTok"
        className={INPUT}
      />

      <fieldset>
        <legend className="mb-1.5 text-[11.5px] text-soft">Tu y es réellement allé·e ?</legend>
        <input type="hidden" name="visited" value={visited ?? ""} />
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["oui", "Oui"],
              ["non", "Non, mais on m’en a parlé"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={visited === value}
              onClick={() => {
                setVisited(value);
                setLocalError(null);
              }}
              className={`inline-flex items-center rounded-full border-[1.5px] px-3.5 py-[9px] text-[13.5px] font-semibold transition-colors ${
                visited === value ? "border-ink bg-ink text-cream" : "border-line bg-cream-2 text-ink hover:border-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <textarea
        name="note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={600}
        placeholder="Pourquoi tu le recommandes ?"
        aria-label="Pourquoi tu le recommandes ?"
        className={`${INPUT} min-h-[88px] resize-none rounded-[14px]`}
      />

      <div>
        <Toggle name="visibleOnlyToRequester" label={`Visible seulement par ${requester}`} defaultOn />
        <Toggle name="reusable" label={`Autoriser WHERE à réutiliser cette reco pour ${requester} à l’avenir`} defaultOn />
      </div>

      {localError || state.status === "error" ? (
        <p role="alert" className="rounded-[14px] bg-amber-2 px-3.5 py-3 text-[13.5px] text-[#6e4f14]">
          {localError ?? (state.status === "error" ? state.message : null)}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-coral px-5 text-[14.5px] font-bold text-white transition-colors hover:bg-[#d2644b] disabled:opacity-60"
      >
        Envoyer ma recommandation
      </button>
    </form>
  );
}
