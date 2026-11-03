"use client";

import { useTranslations } from "next-intl";
import { useActionState, useRef } from "react";
import { verifyEmailCode, type CodeState } from "./actions";

const initial: CodeState = { status: "idle" };

/** L'expéditeur des emails de connexion (SMTP Resend de Supabase) : sert à filtrer la boîte. */
const SENDER = "hello@wh3re.com";

/**
 * Boîte mail à ouvrir d'un geste, d'après le domaine de l'adresse. La recherche Gmail inclut les
 * indésirables (in:anywhere). Domaine inconnu : pas de bouton, le code suffit.
 */
function mailbox(email: string): { name: string; href: string } | null {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (["gmail.com", "googlemail.com"].includes(domain)) {
    return {
      name: "Gmail",
      href: `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(`from:${SENDER} in:anywhere`)}`,
    };
  }
  if (/^(outlook|hotmail|live|msn)\./.test(domain)) return { name: "Outlook", href: "https://outlook.live.com/mail/0/" };
  if (/^(yahoo|ymail)\./.test(domain)) return { name: "Yahoo Mail", href: "https://mail.yahoo.com/" };
  if (["icloud.com", "me.com", "mac.com"].includes(domain)) return { name: "iCloud Mail", href: "https://www.icloud.com/mail" };
  if (["proton.me", "protonmail.com", "pm.me"].includes(domain)) return { name: "Proton Mail", href: "https://mail.proton.me/" };
  return null;
}

/** Après l'envoi : ouvrir sa boîte en un clic, puis taper le code (ou toucher le lien). */
export function CodeStep({ email }: { email: string }) {
  const [state, action, pending] = useActionState(verifyEmailCode, initial);
  const form = useRef<HTMLFormElement>(null);
  const t = useTranslations("login");
  const box = mailbox(email);

  return (
    <div className="flex flex-col gap-3.5" aria-live="polite">
      <p className="text-[14px] leading-snug text-ink-2">
        {t.rich("code.sent", { email, b: (chunks) => <b className="font-bold text-ink">{chunks}</b> })}
      </p>
      {box ? (
        <a
          href={box.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-ink px-5 text-[14.5px] font-bold text-white transition-opacity hover:opacity-90"
        >
          {t("code.open", { mailbox: box.name })}
        </a>
      ) : null}
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
          className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-orange px-5 text-[14.5px] font-bold text-white shadow-orange transition-colors hover:bg-[#ee4a10] disabled:opacity-60"
        >
          {pending ? t("code.checking") : t("code.submit")}
        </button>
      </form>
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
