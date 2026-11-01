import type { Metadata } from "next";
import type { T } from "@/i18n/translator";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { AutoRefresh, DeliveriesButton } from "@/components/import/import-widgets";
import { ImportSetup } from "@/components/import/import-setup";
import { GMAIL_LINKS, gmailFilterQuery, isReservedDomain } from "@/lib/inbound/platforms";
import { EmailSourceActions } from "@/components/privacy/email-source";
import { getServerEnv } from "@/lib/env.server";
import { forwardAddress } from "@/lib/inbound/resend";
import {
  formatDay,
  isReservation,
  kindBadge,
  provenanceLabel,
  summarizeImport,
  type ImportedEmail,
} from "@/lib/inbound/rules";
import { forwardTokenOf, gmailFilterState, listImported } from "@/lib/inbound/store";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("import");
  return { title: t("metaTitle") };
}

const CARD = "rounded-card border border-line bg-paper-2 p-4 shadow-soft";
const EYEBROW = "text-[13px] font-semibold text-muted";

function Notice({ tone, children }: { tone: "warn" | "soft" | "info"; children: ReactNode }) {
  const bg = { warn: "bg-amber-2", soft: "bg-lilac-2", info: "bg-blue-2" }[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-[14px] px-3.5 py-3 text-[13px] leading-normal text-ink-2 ${bg}`}>
      {children}
    </div>
  );
}

function Line({ email, t, locale }: { email: ImportedEmail; t: T; locale: string }) {
  if (!isReservation(email.kind)) return null;
  const date = formatDay(email.reservedFor, true, locale);
  return (
    <div className="flex items-center gap-3 border-b border-line py-[11px] last:border-b-0">
      <div className="min-w-0 grow">
        <div className="font-bold">
          {email.placeName}
          {email.city ? <span className="text-[12.5px] font-medium text-muted"> · {email.city}</span> : null}
        </div>
        <div className="text-[12.5px] text-muted">
          {[provenanceLabel(t, email.kind, email.platform), date].filter(Boolean).join(" · ")}
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-lilac-2 px-[9px] py-1 text-[11.5px] font-bold text-ink-2">
        {kindBadge(t, email.kind)}
      </span>
    </div>
  );
}

function Group({ title, emails, t, locale }: { title: string; emails: ImportedEmail[]; t: T; locale: string }) {
  if (emails.length === 0) return null;
  return (
    <div className={CARD}>
      <div className={EYEBROW}>{title}</div>
      <div className="flex flex-col">
        {emails.map((e) => (
          <Line key={e.id} email={e} t={t} locale={locale} />
        ))}
      </div>
    </div>
  );
}

async function Results() {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [token, emails, filter] = await Promise.all([
    forwardTokenOf(supabase),
    listImported(supabase),
    gmailFilterState(supabase, user?.email ?? ""),
  ]);
  const env = getServerEnv();
  const domain = env.WHERE_INBOUND_DOMAIN;
  // Sans Resend configuré (version locale, ou mise en ligne incomplète), aucun email n'arrive : on le dit.
  const receiving = Boolean(domain && env.RESEND_API_KEY && env.RESEND_WEBHOOK_SECRET && !isReservedDomain(domain));
  const s = summarizeImport(emails);
  const t = await getTranslations("import");
  const locale = await getLocale();
  const b = (chunks: ReactNode) => <b>{chunks}</b>;
  const found = s.restaurants.length + s.hotels.length + s.activities.length;

  return (
    <>
      <AutoRefresh />
      {token && domain ? (
        <ImportSetup
          address={forwardAddress(token, domain)}
          accountEmail={user?.email ?? ""}
          links={{ forwarding: GMAIL_LINKS.forwarding, search: GMAIL_LINKS.search(gmailFilterQuery()) }}
          query={gmailFilterQuery()}
          confirmation={filter.confirmation}
          active={filter.lastPlatformEmailAt !== null}
          receiving={receiving}
        />
      ) : !token ? (
        <div className={`${CARD} flex flex-col gap-2.5`}>
          <p className="text-[14px] text-ink-2">{t("page.disconnected")}</p>
          <EmailSourceActions connected={false} />
        </div>
      ) : (
        <div className={CARD}>
          <p className="text-[12.5px] text-muted">{t("page.addressUnavailable")}</p>
        </div>
      )}

      <p className="text-[12.5px] text-muted">{t("page.privacy")}</p>

      {emails.length === 0 ? null : (
        <>
          <h2 className="mt-2 font-display text-[28px] font-bold leading-[1.12] tracking-[-0.02em]">
            {t("page.foundTitle")}
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {(
              [
                [s.restaurants.length, t("page.stats.restaurants")],
                [s.hotels.length, t("page.stats.hotels")],
                [s.activities.length, t("page.stats.activities")],
              ] as const
            ).map(([n, label]) => (
              <div key={label} className="flex flex-col gap-0.5 rounded-2xl border border-line bg-paper-2 p-3.5">
                <b className="font-display text-[28px] font-bold leading-none">{n}</b>
                <span className="text-[12px] text-muted">{label}</span>
              </div>
            ))}
          </div>

          {s.noOntopo ? (
            <Notice tone="warn">
              <span>{t.rich("page.noOntopo", { b })}</span>
            </Notice>
          ) : null}
          {s.deliveries.length > 0 ? (
            <Notice tone="soft">
              <span>
                <b>{t(s.deliveriesAllTabit ? "page.deliveriesTabit" : "page.deliveries", { count: s.deliveries.length })}</b>{" "}
                {t("page.deliveriesNote")}
              </span>
              <DeliveriesButton deliveries={s.deliveries} allTabit={s.deliveriesAllTabit} />
            </Notice>
          ) : null}
          {s.cancellations.length > 0 ? (
            <Notice tone="soft">
              <span>
                <b>{t("page.cancellations", { count: s.cancellations.length })}</b>{" "}
                {t("page.cancellationsNote")}
              </span>
            </Notice>
          ) : null}

          <Group title={t("page.groups.restaurants")} emails={s.restaurants} t={t} locale={locale} />
          <Group title={t("page.groups.hotels")} emails={s.hotels} t={t} locale={locale} />
          <Group title={t("page.groups.activities")} emails={s.activities} t={t} locale={locale} />

          {found > 0 ? (
            <p className="text-[12.5px] text-muted">
              {t("page.qualifyHint")}
            </p>
          ) : null}
          {s.pending > 0 ? (
            <Link
              href="/import/qualify"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-ink px-5 text-[14.5px] font-bold text-paper transition-colors hover:bg-night"
            >
              {t("page.qualifyCta")}
            </Link>
          ) : null}
        </>
      )}
    </>
  );
}

/* Import par transfert d'email (docs/prototype.html, scrGmail et scrGmailResults, sans Gmail OAuth). */
export default function ImportPage() {
  const t = useTranslations("import");
  return (
    <div className="px-[22px] pt-3 pb-7 lg:px-9 lg:pt-7">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        <div className="text-[13px] font-semibold text-muted">{t("page.eyebrow")}</div>
        <h1 className="font-display text-[22px] font-bold leading-tight">
          {t("page.title")}
        </h1>
        <p className="text-[15px] leading-normal text-muted">
          {t("page.lead")}
        </p>
        <Suspense fallback={<div className="h-[220px] animate-pulse rounded-card border border-line bg-paper-2" />}>
          <Results />
        </Suspense>
      </div>
    </div>
  );
}
