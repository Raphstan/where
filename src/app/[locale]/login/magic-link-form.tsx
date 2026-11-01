"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { PRIVACY_POLICY_PATH, TERMS_PATH } from "@/content/legal";
import { sendMagicLink, type MagicLinkState } from "./actions";

const initial: MagicLinkState = { status: "idle" };

/**
 * `termsOnDevice` : les conditions en vigueur ont déjà été acceptées sur cet appareil (cookie) ;
 * la case n'est pas redemandée. Sinon elle est obligatoire (le serveur la vérifie aussi).
 */
export function MagicLinkForm({ next, termsOnDevice }: { next?: string; termsOnDevice: boolean }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);
  const t = useTranslations("login");

  if (state.status === "waitlist") {
    return (
      <div className="flex flex-col gap-3.5" aria-live="polite">
        <div className="flex items-start gap-2.5 rounded-[14px] bg-lilac-2 px-3.5 py-3 text-[13.5px] leading-snug text-ink">
          <span>{t.rich("waitlist.text", { email: state.email, b: (chunks) => <b className="font-bold">{chunks}</b> })}</span>
        </div>
        <p className="text-[12.5px] text-muted">
          {t.rich("waitlist.join", {
            link: (chunks) => (
              <a href="https://wh3re.com" className="font-semibold text-blue hover:underline">
                {chunks}
              </a>
            ),
          })}
        </p>
      </div>
    );
  }

  if (state.status === "sent") {
    return (
      <div className="flex flex-col gap-3.5" aria-live="polite">
        <div className="flex items-start gap-2.5 rounded-[14px] bg-olive-2 px-3.5 py-3 text-[13.5px] leading-snug text-[#28553b]">
          <span>
            {t.rich("form.sent", {
              email: state.email,
              b: (chunks) => <b className="font-bold">{chunks}</b>,
            })}
          </span>
        </div>
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

  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-muted">
          {t("form.emailLabel")}
        </span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={t("form.emailPlaceholder")}
          className="w-full rounded-xl border-[1.5px] border-line bg-paper-2 px-3.5 py-[11px] text-[14px] text-ink outline-none placeholder:text-soft focus:border-ink"
        />
      </label>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      {termsOnDevice ? (
        <input type="hidden" name="terms" value="on" />
      ) : (
        <label className="flex items-start gap-2.5 text-[12.5px] leading-snug text-ink-2">
          <input type="checkbox" name="terms" required className="mt-0.5 size-4 shrink-0 accent-orange" />
          <span>
            {t.rich("form.terms", {
              terms: (chunks) => (
                <Link href={TERMS_PATH} target="_blank" className="font-semibold text-blue hover:underline">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href={PRIVACY_POLICY_PATH} target="_blank" className="font-semibold text-blue hover:underline">
                  {chunks}
                </Link>
              ),
            })}
          </span>
        </label>
      )}
      {state.status === "error" ? (
        <p role="alert" className="rounded-[14px] bg-amber-2 px-3.5 py-3 text-[13.5px] text-[#6e4f14]">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-orange px-5 text-[14.5px] font-bold text-white shadow-orange transition-colors hover:bg-[#ee4a10] disabled:opacity-60"
      >
        {pending ? t("form.sending") : t("form.submit")}
      </button>
      <p className="text-center text-[11.5px] text-soft">
        {t("form.noPassword")}
      </p>
    </form>
  );
}
