"use client";

import { useActionState } from "react";
import { sendMagicLink, type MagicLinkState } from "./actions";

const initial: MagicLinkState = { status: "idle" };

export function MagicLinkForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === "sent") {
    return (
      <div className="flex flex-col gap-3.5" aria-live="polite">
        <div className="flex items-start gap-2.5 rounded-[14px] bg-olive-2 px-3.5 py-3 text-[13.5px] leading-snug text-[#375434]">
          <span aria-hidden className="shrink-0">
            ✉️
          </span>
          <span>
            <b className="font-bold">Lien envoyé.</b> Ouvre l&apos;email reçu à{" "}
            <b className="font-bold">{state.email}</b> et clique sur le lien : il te connecte, sans mot
            de passe.
          </span>
        </div>
        <p className="text-[12.5px] text-muted">
          Rien reçu ? Regarde dans les indésirables, ou{" "}
          <a href="/login" className="font-semibold text-blue hover:underline">
            renvoie un lien
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
          Ton email
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder="prenom@exemple.com"
          className="w-full rounded-xl border-[1.5px] border-line bg-cream-2 px-3.5 py-[11px] text-[14px] text-ink outline-none placeholder:text-soft focus:border-ink"
        />
      </label>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {state.status === "error" ? (
        <p role="alert" className="rounded-[14px] bg-amber-2 px-3.5 py-3 text-[13.5px] text-[#6e4f14]">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-ink px-5 text-[14.5px] font-bold text-cream transition-colors hover:bg-[#0f1722] disabled:opacity-60"
      >
        {pending ? "Envoi…" : "Recevoir mon lien"}
      </button>
      <p className="text-center text-[11.5px] text-soft">
        Pas de mot de passe. Le lien reçu par email suffit.
      </p>
    </form>
  );
}
