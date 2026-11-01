import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Wordmark } from "@/components/shell/wordmark";
import { JoinWelcome } from "./join-welcome";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("guest.join");
  return { title: t("metaTitle"), robots: { index: false, follow: false }, referrer: "no-referrer" };
}

/**
 * « Bienvenue, Sarah. » (docs/prototype.html, sarahJoin) : le proche vient de créer son compte depuis
 * son lien privé. Route protégée par le proxy : on y arrive connecté, par le lien magique.
 */
export default function JoinPage({ params }: PageProps<"/[locale]/join/[token]">) {
  return (
    <div className="hero flex min-h-dvh flex-1 flex-col">
      <main className="mx-auto mt-auto flex w-full max-w-[480px] flex-col gap-4 rounded-t-[24px] bg-paper-2 px-5 pt-5 pb-[30px] sm:my-auto sm:rounded-[24px] sm:shadow-soft">
        <Wordmark className="text-[16px]" />
        <Suspense fallback={<div className="h-[360px] animate-pulse rounded-card bg-paper" />}>
          {params.then(({ token }) => (
            <JoinWelcome token={token} />
          ))}
        </Suspense>
      </main>
    </div>
  );
}
