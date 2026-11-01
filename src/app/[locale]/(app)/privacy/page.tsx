import type { Metadata } from "next";
import { connection } from "next/server";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense, type ReactNode } from "react";
import { DeleteActions, UsageToggles } from "@/components/privacy/privacy-controls";
import { PageFrame } from "@/components/shell/page-frame";
import { privacyOverview } from "@/lib/privacy/store";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("privacy");
  return { title: t("title") };
}

const CARD = "rounded-card border border-line bg-paper-2 p-4";
const EYEBROW = "text-[13px] font-semibold text-muted";

/** Principes de la maquette, dans l'ordre (libellés : `principles.{clé}`). */
const PRINCIPLES = ["privateByDefault", "noPublishing", "noAttribution", "noSecretReading", "noSilentSend", "fullControl"] as const;

function Kv({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-[11px] text-[13.5px] last:border-b-0">
      <span className="text-muted">{k}</span>
      <span className="text-end">{children}</span>
    </div>
  );
}

async function Overview() {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const o = await privacyOverview(supabase, user.id);
  const t = await getTranslations("privacy");

  return (
    <>
      <div className={CARD}>
        <div className={EYEBROW}>{t("connected.title")}</div>
        <Kv k={t("connected.email")}>
          {o.emailSource ? t("connected.emailOn", { count: o.confirmations }) : t("connected.emailOff")}
        </Kv>
        <Kv k={t("connected.importedPlaces")}>{o.importedPlaces}</Kv>
      </div>
      <div className={CARD}>
        <div className={EYEBROW}>{t("circle.title")}</div>
        <Kv k={t("circle.people")}>{t("circle.peopleValue", { count: o.circleSize })}</Kv>
        <Kv k={t("circle.theySee")}>{t("circle.theySeeValue")}</Kv>
        <Kv k={t("circle.feedback")}>{t("circle.feedbackValue")}</Kv>
      </div>
      <div className={CARD}>
        <div className={EYEBROW}>{t("usage.title")}</div>
        <UsageToggles initial={o.usage} />
      </div>
      <div className={`${CARD} flex flex-col gap-2`}>
        <div className={EYEBROW}>{t("delete.title")}</div>
        <DeleteActions emailSource={o.emailSource} importedPlaces={o.importedPlaces} />
      </div>
    </>
  );
}

/* Confidentialité (docs/prototype.html, scrPrivacy). */
export default function PrivacyPage() {
  const t = useTranslations("privacy");
  return (
    <PageFrame
      title={t("title")}
      lead={t("lead")}
      back="/profile"
    >
      <div className={CARD}>
        <div className={EYEBROW}>{t("principles.title")}</div>
        <div className="mt-2 flex flex-col gap-[9px] text-[13px] text-ink-2">
          {PRINCIPLES.map((k) => (
            <div key={k}>{t(`principles.${k}`)}</div>
          ))}
        </div>
      </div>
      <Suspense fallback={<div className="h-[420px] animate-pulse rounded-card border border-line bg-paper-2" />}>
        <Overview />
      </Suspense>
    </PageFrame>
  );
}
