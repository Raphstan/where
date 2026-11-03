"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useRef, useState } from "react";
import { mailbox } from "@/lib/auth/mailbox";
import { pollLogin, verifyEmailCode, type CodeState } from "./actions";

const initial: CodeState = { status: "idle" };
const POLL_MS = 2000;

/**
 * Après l'envoi : ouvrir sa boîte d'un geste, toucher le lien, et cette page se connecte seule
 * (pollLogin). Le code reste en secours, pour un email ouvert sur un autre appareil.
 */
export function CodeStep({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyEmailCode, initial);
  const [showCode, setShowCode] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const t = useTranslations("login");
  const box = mailbox(email);

  useEffect(() => {
    let stopped = false;
    let busy = false;
    const check = async () => {
      if (stopped || busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const result = await pollLogin();
        if (result.status === "in") {
          stopped = true;
          window.location.assign(result.next);
        } else if (result.status === "gone") {
          stopped = true;
        }
      } catch {
        // Réseau coupé un instant : on réessaie au prochain tour.
      } finally {
        busy = false;
      }
    };
    const timer = window.setInterval(check, POLL_MS);
    // Retour dans Safari après le lien touché dans Gmail : on vérifie tout de suite.
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, []);

  return (
    <div className="flex flex-col gap-3.5" aria-live="polite">
      <p className="text-[14px] leading-snug text-ink-2">
        {t.rich("waiting.sent", { email, b: (chunks) => <b className="font-bold text-ink">{chunks}</b> })}
      </p>
      {box ? (
        <a
          href={box.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-orange px-5 text-[14.5px] font-bold text-white shadow-orange transition-colors hover:bg-[#ee4a10]"
        >
          {t("waiting.open", { mailbox: box.name })}
        </a>
      ) : null}
      {showCode ? (
        <form ref={form} action={action} className="flex flex-col gap-3">
          <input type="hidden" name="email" value={email} />
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">{t("code.label")}</span>
            <input
              name="code"
              required
              autoFocus
              autoComplete="one-time-code"
              inputMode="numeric"
              pattern="[0-9 ]*"
              maxLength={9}
              placeholder="123456"
              onChange={(e) => {
                // Six chiffres tapés ou collés : on valide sans attendre le bouton.
                if (e.target.value.replace(/\D/g, "").length === 6 && !pending) form.current?.requestSubmit();
              }}
              className="w-full rounded-xl border-[1.5px] border-line bg-paper-2 px-3.5 py-[11px] text-center text-[22px] font-bold tracking-[0.3em] text-ink outline-none placeholder:text-soft placeholder:font-normal focus:border-ink"
            />
          </label>
          {state.status === "error" ? (
            <p role="alert" className="rounded-[14px] bg-amber-2 px-3.5 py-3 text-[13.5px] text-[#6e4f14]">
              {t("code.bad")}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-ink px-5 text-[14.5px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {pending ? t("code.checking") : t("code.submit")}
          </button>
        </form>
      ) : (
        <p className="text-[12.5px] text-muted">
          {t.rich("waiting.otherDevice", {
            link: (chunks) => (
              <button type="button" onClick={() => setShowCode(true)} className="font-semibold text-blue hover:underline">
                {chunks}
              </button>
            ),
          })}
        </p>
      )}
      <p className="text-[12.5px] text-muted">
        {t.rich("form.resend", {
          link: (chunks) => (
            // Rechargement complet voulu : remet le formulaire à zéro (useActionState).
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a href="/login" className="font-semibold text-blue hover:underline">
              {chunks}
            </a>
          ),
        })}
      </p>
    </div>
  );
}
