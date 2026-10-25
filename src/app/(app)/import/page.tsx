import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { AutoRefresh, CopyAddress, DeliveriesButton } from "@/components/import/import-widgets";
import { SourceLogo } from "@/components/import/source-logo";
import { EmailSourceActions } from "@/components/privacy/email-source";
import { getServerEnv } from "@/lib/env.server";
import { forwardAddress } from "@/lib/inbound/resend";
import {
  formatDay,
  isReservation,
  KIND_BADGE,
  provenanceLabel,
  summarizeImport,
  type ImportedEmail,
} from "@/lib/inbound/rules";
import { forwardTokenOf, listImported } from "@/lib/inbound/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Retrouver mes réservations" };

const CARD = "rounded-card border border-line bg-cream-2 p-4 shadow-soft";
const EYEBROW = "text-[11px] font-bold tracking-[0.14em] text-muted uppercase";

function Notice({ icon, tone, children }: { icon: string; tone: "warn" | "soft" | "info"; children: ReactNode }) {
  const bg = { warn: "bg-amber-2", soft: "bg-sand-2", info: "bg-blue-2" }[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-[14px] px-3.5 py-3 text-[13px] leading-normal text-ink-2 ${bg}`}>
      <span aria-hidden className="shrink-0">
        {icon}
      </span>
      {children}
    </div>
  );
}

function Line({ email }: { email: ImportedEmail }) {
  if (!isReservation(email.kind)) return null;
  const date = formatDay(email.reservedFor, true);
  return (
    <div className="flex items-center gap-3 border-b border-line py-[11px] last:border-b-0">
      <SourceLogo platform={email.platform} kind={email.kind} />
      <div className="min-w-0 grow">
        <div className="font-bold">
          {email.placeName}
          {email.city ? <span className="text-[12.5px] font-medium text-muted"> — {email.city}</span> : null}
        </div>
        <div className="text-[12.5px] text-muted">
          {[provenanceLabel(email.kind, email.platform), date].filter(Boolean).join(" · ")}
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-sand-2 px-[9px] py-1 text-[11.5px] font-bold text-ink-2">
        {KIND_BADGE[email.kind]}
      </span>
    </div>
  );
}

function Group({ title, emails }: { title: string; emails: ImportedEmail[] }) {
  if (emails.length === 0) return null;
  return (
    <div className={CARD}>
      <div className={EYEBROW}>{title}</div>
      <div className="flex flex-col">
        {emails.map((e) => (
          <Line key={e.id} email={e} />
        ))}
      </div>
    </div>
  );
}

async function Results() {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const supabase = await createClient();
  const [token, emails] = await Promise.all([forwardTokenOf(supabase), listImported(supabase)]);
  const domain = getServerEnv().WHERE_INBOUND_DOMAIN;
  const s = summarizeImport(emails);
  const found = s.restaurants.length + s.hotels.length + s.activities.length;

  return (
    <>
      <AutoRefresh />
      <div className={`${CARD} flex flex-col gap-2.5`}>
        <div className={EYEBROW}>Adresse de transfert</div>
        {token && domain ? (
          <>
            <CopyAddress address={forwardAddress(token, domain)} />
            <p className="text-[12.5px] text-muted">
              Transfère à cette adresse, depuis l’adresse de ton compte, tes confirmations de restaurants, hôtels et
              activités.
            </p>
          </>
        ) : !token ? (
          <>
            <p className="text-[12.5px] text-muted">Non connecté</p>
            <EmailSourceActions connected={false} />
          </>
        ) : (
          <p className="text-[12.5px] text-muted">L’adresse de transfert n’est pas encore disponible.</p>
        )}
        <p className="text-[11.5px] text-soft">
          Les livraisons sont écartées : une commande Tabit ou Wolt n’est pas une visite au restaurant.
        </p>
      </div>

      <div className="flex flex-col gap-[9px] text-[13px] text-ink-2">
        {[
          "WHERE ne lit que les emails que tu lui transfères",
          "Tu peux supprimer les données importées à tout moment",
          "Les emails personnels sans rapport ne sont pas utilisés",
          "Les résultats détectés te sont montrés avant d’être ajoutés à ton profil",
        ].map((t) => (
          <div key={t} className="flex items-start gap-2.5">
            <span className="shrink-0 text-olive">✓</span>
            {t}
          </div>
        ))}
      </div>

      {emails.length === 0 ? (
        <div className={CARD}>
          <p className="text-[12.5px] text-muted">
            Aucun email reçu pour l’instant. Transfère une confirmation : elle apparaîtra ici en quelques secondes.
          </p>
        </div>
      ) : (
        <>
          <h2 className="mt-2 font-display text-[28px] font-normal leading-[1.12] tracking-[-0.01em]">
            Voilà ce que j’ai retrouvé.
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {(
              [
                [s.restaurants.length, "restaurants"],
                [s.hotels.length, "hôtels"],
                [s.activities.length, "activités"],
              ] as const
            ).map(([n, label]) => (
              <div key={label} className="flex flex-col gap-0.5 rounded-2xl border border-line bg-cream-2 p-3.5">
                <b className="font-display text-[28px] font-medium leading-none">{n}</b>
                <span className="text-[12px] text-muted">{label}</span>
              </div>
            ))}
          </div>

          {s.noOntopo ? (
            <Notice icon="⚠️" tone="warn">
              <span>
                <b>Aucune réservation Ontopo trouvée</b> dans les emails. Certaines confirmations ont peut-être été
                envoyées uniquement par SMS.
              </span>
            </Notice>
          ) : null}
          {s.deliveries.length > 0 ? (
            <Notice icon="🛵" tone="soft">
              <span>
                <b>
                  {s.deliveries.length} {s.deliveries.length > 1 ? "commandes" : "commande"} de livraison
                  {s.deliveriesAllTabit ? " Tabit" : ""} {s.deliveries.length > 1 ? "exclues" : "exclue"}.
                </b>{" "}
                Une livraison n’est pas une visite au restaurant — elles ne compteront jamais comme telle.
              </span>
              <DeliveriesButton deliveries={s.deliveries} allTabit={s.deliveriesAllTabit} />
            </Notice>
          ) : null}
          {s.cancellations.length > 0 ? (
            <Notice icon="✕" tone="soft">
              <span>
                <b>
                  {s.cancellations.length} {s.cancellations.length > 1 ? "annulations écartées" : "annulation écartée"}.
                </b>{" "}
                Une réservation annulée ne compte jamais comme visite.
              </span>
            </Notice>
          ) : null}

          <Group title="Restaurants" emails={s.restaurants} />
          <Group title="Hôtels" emails={s.hotels} />
          <Group title="Activités & événements" emails={s.activities} />

          {found > 0 ? (
            <p className="text-[12.5px] text-muted">
              Une réservation ne veut pas dire que tu y es allé, ni que tu as aimé. Prochaine étape : quelques
              questions rapides pour qualifier ces expériences.
            </p>
          ) : null}
          {s.pending > 0 ? (
            <Link
              href="/import/qualify"
              className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-ink px-5 text-[14.5px] font-bold text-cream transition-colors hover:bg-[#0f1722]"
            >
              Qualifier mes expériences
            </Link>
          ) : null}
        </>
      )}
    </>
  );
}

/* Import par transfert d'email (docs/prototype.html, scrGmail et scrGmailResults, sans Gmail OAuth). */
export default function ImportPage() {
  return (
    <div className="px-[22px] pt-3 pb-7 lg:px-9 lg:pt-7">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4">
        <div className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Transfert d’email</div>
        <h1 className="font-display text-[22px] font-medium leading-tight">
          Tu as déjà une mémoire de tes sorties cachée dans tes emails.
        </h1>
        <p className="text-[15px] leading-normal text-muted">
          WHERE peut y retrouver les confirmations de restaurants, hôtels, activités, événements et voyages.
        </p>
        <Suspense fallback={<div className="h-[220px] animate-pulse rounded-card border border-line bg-cream-2" />}>
          <Results />
        </Suspense>
      </div>
    </div>
  );
}
