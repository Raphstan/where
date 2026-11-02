import type { Metadata } from "next";
import { connection } from "next/server";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { EmailSourceActions } from "@/components/privacy/email-source";
import { PageFrame } from "@/components/shell/page-frame";
import {
  ForwardMailLogo,
  GmailLogo,
  GoogleLogo,
  GoogleMapsLogo,
  InstagramLogo,
  SmsLogo,
  TikTokLogo,
  WhatsAppLogo,
} from "@/components/sources/brand-logos";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sources");
  return { title: t("title") };
}

const BADGE = {
  ok: "bg-olive-2 text-olive",
  off: "bg-lilac-2 text-muted",
  soon: "bg-blue-2 text-blue",
} as const;

/**
 * Une carte par compte, comme la page Connectors de Happenstance : logo, nom, une phrase sur ce que
 * le compte apporte, un état. Le détail de ce que WH3RE lit (textes de la maquette, scrSources)
 * reste à un clic.
 */
function ConnectorCard({
  logo,
  name,
  short,
  badge,
  status,
  reads,
  children,
}: {
  logo: ReactNode;
  name: string;
  short: string;
  badge: keyof typeof BADGE;
  status: string;
  reads: string;
  children?: ReactNode;
}) {
  const t = useTranslations("sources");
  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-paper-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-ink [&>svg]:size-[22px]">
          {logo}
        </span>
        <span className={`inline-flex items-center rounded-full px-[9px] py-1 text-[11.5px] font-bold ${BADGE[badge]}`}>
          {status}
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[15px] font-bold">{name}</h3>
        <p className="text-[13.5px] text-ink-2">{short}</p>
      </div>
      {children}
      <details className="group text-[12.5px] text-muted">
        <summary className="cursor-pointer font-semibold text-blue marker:content-none hover:underline">
          {t("reads")}
        </summary>
        <p className="pt-1.5">{reads}</p>
      </details>
    </div>
  );
}

async function EmailConnector() {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.from("forward_addresses").select("user_id").maybeSingle();
  const connected = data !== null;
  const t = await getTranslations("sources");
  return (
    <ConnectorCard
      logo={<ForwardMailLogo />}
      name={t("email.name")}
      short={t("short.email")}
      badge={connected ? "ok" : "off"}
      status={connected ? t("email.badgeOn") : t("email.off")}
      reads={t("email.text")}
    >
      <EmailSourceActions connected={connected} />
    </ConnectorCard>
  );
}

type Soon = { key: "gmail" | "contacts" | "maps" | "whatsapp" | "instagram" | "tiktok" | "sms"; logo: ReactNode };

/* Pas encore branchés : badge « Bientôt ». Ordre : ce qui remplit le plus vite la mémoire d'abord. */
const SOON: readonly Soon[] = [
  { key: "gmail", logo: <GmailLogo /> },
  { key: "contacts", logo: <GoogleLogo /> },
  { key: "maps", logo: <GoogleMapsLogo /> },
  { key: "whatsapp", logo: <WhatsAppLogo /> },
  { key: "instagram", logo: <InstagramLogo /> },
  { key: "tiktok", logo: <TikTokLogo /> },
  { key: "sms", logo: <SmsLogo /> },
];

/** Noms de marque (non traduits). */
const BRAND: Partial<Record<Soon["key"], string>> = {
  maps: "Google Maps",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  tiktok: "TikTok",
  sms: "SMS",
};

/** Noms de marque ; seule « Sites directs » se traduit (`platforms.direct`). */
const PLATFORMS = ["Ontopo", "Tabit", "Resy", "OpenTable", "Restu", "Google Reserve"];

/* Connecteurs (ex-« Mes sources », docs/prototype.html, scrSources). */
export default function SourcesPage() {
  const t = useTranslations("sources");
  return (
    <PageFrame title={t("title")} lead={t("lead")} back="/profile" wide>
      <h2 className="pt-2 font-display text-[19px] font-bold">{t("accounts")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <Suspense fallback={<div className="h-[190px] animate-pulse rounded-card border border-line bg-paper-2" />}>
          <EmailConnector />
        </Suspense>
        {SOON.map((s) => {
          const isNext = s.key === "gmail" || s.key === "contacts";
          return (
            <ConnectorCard
              key={s.key}
              logo={s.logo}
              name={isNext ? t(`next.${s.key}.name`) : (BRAND[s.key] ?? s.key)}
              short={t(`short.${s.key}`)}
              badge="soon"
              status={t("soon")}
              reads={isNext ? t(`next.${s.key}.text`) : t(`later.${s.key as "maps" | "whatsapp" | "instagram" | "tiktok" | "sms"}`)}
            />
          );
        })}
      </div>

      <div className="mt-2 flex flex-col gap-2 rounded-card border border-line bg-paper-2 p-4">
        <h2 className="text-[15px] font-bold">{t("platforms.title")}</h2>
        <div className="flex flex-wrap gap-1.5">
          {[...PLATFORMS, t("platforms.direct")].map((p) => (
            <span key={p} className="inline-flex rounded-full border-[1.5px] border-line bg-paper-2 px-3 py-[7px] text-[12px] font-medium">
              {p}
            </span>
          ))}
        </div>
        <p className="text-[12.5px] text-muted">{t("platforms.text")}</p>
      </div>
    </PageFrame>
  );
}
