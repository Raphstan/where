"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { signInWithGoogle, type GoogleSignInResult } from "./actions";

/* Sous-ensemble de Google Identity Services utilisé ici (https://accounts.google.com/gsi/client). */
type GoogleId = {
  initialize(config: {
    client_id: string;
    callback: (response: { credential?: string }) => void;
    nonce: string;
    ux_mode: "popup";
    use_fedcm_for_button: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: { theme: "outline"; size: "large"; shape: "pill"; text: "continue_with"; width: number; locale: string },
  ): void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function loadScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? Object.assign(document.createElement("script"), { src: SCRIPT_SRC, async: true });
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("gsi")), { once: true });
    if (!existing) document.head.appendChild(script);
  });
}

/** Nonce : Google reçoit son empreinte SHA-256, Supabase la valeur brute (signInWithIdToken). */
async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}

export function GoogleButton({
  clientId,
  next,
  terms,
  onWaitlist,
}: {
  clientId: string;
  next?: string;
  /** La case des conditions est cochée (ou déjà acceptée sur cet appareil). */
  terms: boolean;
  onWaitlist: (email: string) => void;
}) {
  const t = useTranslations("login");
  const locale = useLocale();
  const slot = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<"googleFailed" | "termsRequired" | "unavailable" | null>(null);
  const [pending, setPending] = useState(false);

  // Le bouton Google est rendu une fois ; il lit les valeurs du moment au clic.
  const latest = useRef({ next, terms, onWaitlist });
  useEffect(() => {
    latest.current = { next, terms, onWaitlist };
  }, [next, terms, onWaitlist]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadScript();
        const nonce = await makeNonce();
        const gsi = window.google?.accounts.id;
        if (cancelled || !gsi || !slot.current) return;
        gsi.initialize({
          client_id: clientId,
          nonce: nonce.hashed,
          ux_mode: "popup",
          use_fedcm_for_button: true,
          callback: async ({ credential }) => {
            if (!credential) return setError("googleFailed");
            setPending(true);
            setError(null);
            const { next: dest, terms: accepted, onWaitlist: waitlist } = latest.current;
            let result: GoogleSignInResult;
            try {
              result = await signInWithGoogle({ credential, nonce: nonce.raw, next: dest, terms: accepted });
            } catch {
              result = { status: "error", error: "googleFailed" };
            }
            if (result.status === "signedIn") {
              // Rechargement complet : les composants serveur relisent la session.
              window.location.assign(result.next);
              return;
            }
            setPending(false);
            if (result.status === "waitlist") waitlist(result.email);
            else setError(result.error);
          },
        });
        const width = Math.min(400, Math.max(200, Math.round(slot.current.offsetWidth)));
        gsi.renderButton(slot.current, { theme: "outline", size: "large", shape: "pill", text: "continue_with", width, locale });
      } catch {
        if (!cancelled) setError("unavailable");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, locale]);

  return (
    <div className="flex flex-col gap-2">
      <div ref={slot} aria-busy={pending} className={`flex min-h-[44px] justify-center ${pending ? "pointer-events-none opacity-60" : ""}`} />
      {error ? (
        <p role="alert" className="rounded-[14px] bg-amber-2 px-3.5 py-3 text-[13.5px] text-[#6e4f14]">
          {error === "termsRequired" ? t("errors.termsRequired") : t(`google.${error}`)}
        </p>
      ) : null}
    </div>
  );
}
