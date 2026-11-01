import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Wordmark } from "@/components/shell/wordmark";
import { loadInvitation } from "@/lib/network/guest";
import { GuestForm } from "./guest-form";

/*
 * Langue : celle du navigateur ou du cookie du proche (segment [locale]), pas celle du demandeur.
 * Le message pré-rédigé, lui, reste dans la langue du demandeur.
 */
export async function generateMetadata({ params }: PageProps<"/[locale]/r/[token]">): Promise<Metadata> {
  const [{ token }, t] = await Promise.all([params, getTranslations("guest")]);
  // Aperçu WhatsApp : seulement le prénom du demandeur, jamais la question (elle est déjà dans le message).
  const invitation = await loadInvitation(token).catch(() => null);
  const requester = invitation?.requesterName ?? t("requesterFallback");
  const title = invitation ? t("ogTitle", { requester }) : t("metaTitle");
  return {
    title: t("metaTitle"),
    openGraph: { title, description: t("ogDescription"), images: [{ url: "/og.png", width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description: t("ogDescription") },
    // Lien privé : jamais indexé, jamais transmis en referer.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

async function Invitation({ token }: { token: string }) {
  const [t, invitation] = await Promise.all([getTranslations("guest"), loadInvitation(token)]);
  if (!invitation) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[21px] font-bold leading-tight">{t("invalidTitle")}</h1>
        <p className="text-[12.5px] text-muted">{t("invalidLead")}</p>
      </div>
    );
  }
  const requester = invitation.requesterName ?? t("requesterFallback");
  return (
    <>
      <h1 className="font-display text-[21px] font-bold leading-tight">{invitation.message}</h1>
      <GuestForm token={token} memberName={invitation.memberName} requester={requester} />
    </>
  );
}

/** Page invité : le proche répond depuis son lien privé, sans compte, sans appli (docs/prototype.html, scrSarah). */
export default function GuestPage({ params }: PageProps<"/[locale]/r/[token]">) {
  const t = useTranslations("guest");
  return (
    <div className="hero flex min-h-dvh flex-1 flex-col">
      <main className="mx-auto mt-auto flex w-full max-w-[480px] flex-col gap-3.5 rounded-t-[24px] bg-paper-2 px-5 pt-5 pb-[30px] sm:my-auto sm:rounded-[24px] sm:shadow-soft">
        <div className="flex items-center">
          <Wordmark className="text-[16px]" />
          <span className="ms-auto text-[11.5px] text-soft">{t("noAccount")}</span>
        </div>
        <Suspense fallback={<div className="h-[420px] animate-pulse rounded-card bg-paper-2" />}>
          {params.then(({ token }) => (
            <Invitation token={token} />
          ))}
        </Suspense>
      </main>
    </div>
  );
}
