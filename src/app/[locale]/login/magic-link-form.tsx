"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { sendMagicLink, type MagicLinkState } from "./actions";

const initial: MagicLinkState = { status: "idle" };

export function MagicLinkForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, initial);
  const t = useTranslations("login");

  if (state.status === "sent") {
    return (
      <div className="flex flex-col gap-3.5" aria-live="polite">
        <div className="flex items-start gap-2.5 rounded-[14px] bg-olive-2 px-3.5 py-3 text-[13.5px] leading-snug text-[#28553b]">
          <span aria-hidden className="shrink-0">
            ✉️
          </span>
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
        <span className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted uppercase">
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
