import type { Metadata } from "next";
import { connection } from "next/server";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { EmailSourceActions } from "@/components/privacy/email-source";
import { PageFrame } from "@/components/shell/page-frame";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("sources");
  return { title: t("title") };
}

const CARD = "flex flex-col gap-2 rounded-card border border-line bg-paper-2 p-4";
const BADGE = {
  ok: "bg-olive-2 text-olive",
  off: "bg-lilac-2 text-muted",
  soon: "bg-blue-2 text-blue",
} as const;

function Logo({ cls, letter }: { cls: string; letter: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex size-9 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-extrabold tracking-[0.02em] ${cls}`}
    >
      {letter}
    </span>
  );
}

function Head({ logo, name, badge, status }: { logo: [string, string]; name: string; badge: keyof typeof BADGE; status: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Logo cls={logo[0]} letter={logo[1]} />
      <div className="min-w-0 grow">
        <h2 className="text-[15px] font-bold">{name}</h2>
        <span className={`inline-flex items-center rounded-full px-[9px] py-1 text-[11.5px] font-bold ${BADGE[badge]}`}>
          {status}
        </span>
      </div>
    </div>
  );
}

/*
 * Sources pas encore disponibles au MVP : descriptions de la maquette (scrSources, `later.{clé}`), badge « Bientôt ».
 * Seul le transfert d'email est actif (CLAUDE.md § 5).
 */
const LATER: readonly { key: "sms" | "whatsapp" | "instagram" | "tiktok" | "maps"; logo: [string, string]; name: string }[] = [
  { key: "sms", logo: ["bg-[#5bc236] text-white", "S"], name: "SMS" },
  { key: "whatsapp", logo: ["bg-[#25d366] text-white", "W"], name: "WhatsApp" },
  { key: "instagram", logo: ["bg-linear-45 from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white", "I"], name: "Instagram" },
  { key: "tiktok", logo: ["bg-[#111111] text-white", "T"], name: "TikTok" },
  { key: "maps", logo: ["bg-[#34a853] text-white", "G"], name: "Google Maps" },
];

/** Noms de marque ; seule « Sites directs » se traduit (`platforms.direct`). */
const PLATFORMS = ["Ontopo", "Tabit", "Resy", "OpenTable", "Restu", "Google Reserve"];

async function EmailSource() {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.from("forward_addresses").select("user_id").maybeSingle();
  const connected = data !== null;
  const t = await getTranslations("sources");
  return (
    <div className={CARD}>
      <Head
        logo={["border border-line bg-white text-[#d44638]", "M"]}
        name={t("email.name")}
        badge={connected ? "ok" : "off"}
        status={connected ? t("email.on") : t("email.off")}
      />
      <p className="text-[12.5px] text-muted">
        {t("email.text")}
      </p>
      <EmailSourceActions connected={connected} />
    </div>
  );
}

/* Mes sources (docs/prototype.html, scrSources). */
export default function SourcesPage() {
  const t = useTranslations("sources");
  return (
    <PageFrame title={t("title")} lead={t("lead")} back="/profile">
      <Suspense fallback={<div className="h-[150px] animate-pulse rounded-card border border-line bg-paper-2" />}>
        <EmailSource />
      </Suspense>
      {LATER.map((s) => (
        <div key={s.name} className={CARD}>
          <Head logo={s.logo} name={s.name} badge="soon" status={t("soon")} />
          <p className="text-[12.5px] text-muted">{t(`later.${s.key}`)}</p>
        </div>
      ))}
      <div className={CARD}>
        <h2 className="text-[15px] font-bold">{t("platforms.title")}</h2>
        <div className="flex flex-wrap gap-1.5">
          {[...PLATFORMS, t("platforms.direct")].map((p) => (
            <span key={p} className="inline-flex rounded-full border-[1.5px] border-line bg-paper-2 px-3 py-[7px] text-[12px] font-medium">
              {p}
            </span>
          ))}
        </div>
        <p className="text-[12.5px] text-muted">
          {t("platforms.text")}
        </p>
      </div>
    </PageFrame>
  );
}
