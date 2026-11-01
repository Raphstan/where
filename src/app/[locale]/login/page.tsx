import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/auth/redirect";
import { TERMS_COOKIE, termsAcceptedOnDevice } from "@/lib/auth/terms";
import { Wordmark } from "@/components/shell/wordmark";
import { MagicLinkForm } from "./magic-link-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("metaTitle") };
}

type SearchParams = PageProps<"/[locale]/login">["searchParams"];

/* Partie dépendante de l'URL (next, error) : sous Suspense pour laisser le reste se pré-rendre. */
async function LoginCard({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = safeNextPath(nextParam);
  const linkError = params.error === "link";
  const termsOnDevice = termsAcceptedOnDevice((await cookies()).get(TERMS_COOKIE)?.value);
  const t = await getTranslations("login");

  return (
    <>
      {linkError ? (
        <p role="alert" className="rounded-[14px] bg-amber-2 px-3.5 py-3 text-[13.5px] text-[#6e4f14]">
          {t("linkExpired")}
        </p>
      ) : null}
      <div className="rounded-card border border-line bg-paper-2 p-4 shadow-soft">
        <MagicLinkForm next={next === "/chat" ? undefined : next} termsOnDevice={termsOnDevice} />
      </div>
    </>
  );
}

export default function LoginPage(props: PageProps<"/[locale]/login">) {
  const t = useTranslations("login");
  return (
    <div className="hero flex min-h-dvh flex-1 flex-col items-center justify-center px-[22px] py-10">
      <div className="flex w-full max-w-[420px] flex-col gap-[18px]">
        <Wordmark className="text-base" />
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] font-medium tracking-[0.08em] text-muted uppercase">{t("eyebrow")}</p>
          <h1 className="font-display text-[28px] font-bold leading-[1.12] tracking-[-0.02em]">
            {t("title")}
          </h1>
          <p className="text-[15px] leading-normal text-muted">
            {t("lead")}
          </p>
        </div>
        <Suspense
          fallback={
            <div className="h-[190px] animate-pulse rounded-card border border-line bg-paper-2" />
          }
        >
          <LoginCard searchParams={props.searchParams} />
        </Suspense>
        <div className="flex items-start gap-2.5 rounded-[14px] bg-lilac-2 px-3.5 py-3 text-[13.5px] text-ink-2">
          <span>{t("privacy")}</span>
        </div>
      </div>
    </div>
  );
}
