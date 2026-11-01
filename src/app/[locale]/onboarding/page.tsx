import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Suspense } from "react";
import { EYEBROW, H1, OnbFrame } from "@/components/home/onb-frame";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("onboarding");
  return { title: t("metaTitle") };
}

/* Les quatre choix de la maquette (scrOnb). Import par transfert d'email au MVP, pas Gmail. */
const CHOICES = [
  ["import", "/import"],
  ["circle", "/onboarding/circle"],
  ["chat", "/chat"],
  ["demo", "/demo"],
] as const;

async function Welcome() {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = user
    ? await supabase.from("users").select("display_name").eq("id", user.id).maybeSingle()
    : { data: null };
  const name = data?.display_name?.trim();
  const t = await getTranslations("onboarding");
  return <>{name ? t("welcomeName", { name }) : t("welcome")}</>;
}

/* Comment veux-tu commencer ? (docs/prototype.html, scrOnb). */
export default function OnboardingPage() {
  const t = useTranslations("onboarding");
  return (
    <OnbFrame back="/">
      <div className={EYEBROW}>
        <Suspense fallback={t("welcome")}>
          <Welcome />
        </Suspense>
      </div>
      <h1 className={H1}>{t("title")}</h1>
      <p className="text-[15px] leading-normal text-muted">
        {t("lead")}
      </p>
      <div className="flex flex-col gap-2.5">
        {CHOICES.map(([key, href]) => (
          <Link
            key={href}
            href={href}
            className="flex w-full items-center gap-3.5 rounded-card border-[1.5px] border-line bg-paper-2 p-4 text-start transition hover:-translate-y-px hover:border-ink"
          >
            <span>
              <span className="block font-bold">{t(`choices.${key}.title`)}</span>
              <span className="block text-[12.5px] text-muted">{t(`choices.${key}.text`)}</span>
            </span>
            <span aria-hidden className="ms-auto text-soft inline-block rtl:-scale-x-100">
              ›
            </span>
          </Link>
        ))}
      </div>
      <div className="flex items-start gap-2.5 rounded-[14px] bg-lilac-2 px-3.5 py-3 text-[13.5px] text-ink-2">
        <span>{t("privacy")}</span>
      </div>
      <Link href="/sources" className="self-center text-[13.5px] font-semibold text-blue hover:underline">
        {t("allSources")}
      </Link>
    </OnbFrame>
  );
}
