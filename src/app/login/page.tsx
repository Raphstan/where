import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNextPath } from "@/lib/auth/redirect";
import { Wordmark } from "@/components/shell/wordmark";
import { MagicLinkForm } from "./magic-link-form";

export const metadata: Metadata = { title: "Connexion" };

type SearchParams = PageProps<"/login">["searchParams"];

/* Partie dépendante de l'URL (next, error) : sous Suspense pour laisser le reste se pré-rendre. */
async function LoginCard({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const nextParam = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = safeNextPath(nextParam);
  const linkError = params.error === "link";

  return (
    <>
      {linkError ? (
        <p role="alert" className="rounded-[14px] bg-amber-2 px-3.5 py-3 text-[13.5px] text-[#6e4f14]">
          Ce lien ne fonctionne plus. Demande-en un nouveau ci-dessous.
        </p>
      ) : null}
      <div className="rounded-card border border-line bg-cream-2 p-4 shadow-soft">
        <MagicLinkForm next={next === "/chat" ? undefined : next} />
      </div>
    </>
  );
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center px-[22px] py-10">
      <div className="flex w-full max-w-[420px] flex-col gap-[18px]">
        <Wordmark className="text-base" />
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold tracking-[0.14em] text-muted uppercase">Bienvenue</p>
          <h1 className="font-display text-[28px] font-normal leading-[1.12] tracking-[-0.01em]">
            Connecte-toi par email.
          </h1>
          <p className="text-[15px] leading-normal text-muted">
            On t&apos;envoie un lien. Tu cliques, tu es dedans.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="h-[190px] animate-pulse rounded-card border border-line bg-cream-2" />
          }
        >
          <LoginCard searchParams={props.searchParams} />
        </Suspense>
        <div className="flex items-start gap-2.5 rounded-[14px] bg-sand-2 px-3.5 py-3 text-[13.5px] text-ink-2">
          <span aria-hidden className="shrink-0">
            🔒
          </span>
          <span>Privé par défaut. Rien n&apos;est publié, aucun message n&apos;est envoyé sans ta confirmation.</span>
        </div>
      </div>
    </div>
  );
}
