import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EYEBROW, H1, OnbFrame } from "@/components/home/onb-frame";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Comment veux-tu commencer ?" };

/* Les quatre choix de la maquette (scrOnb). Import par transfert d'email au MVP, pas Gmail. */
const CHOICES = [
  ["📬", "Retrouver mes anciennes réservations", "Par transfert d’email. Tu valides avant tout ajout.", "/import"],
  ["👥", "Ajouter quelques personnes de confiance", "Sarah pour les tables, Noam pour les bars…", "/onboarding/circle"],
  ["💬", "Poser directement ma première question", "Sans rien connecter. Les réponses seront moins personnelles.", "/chat"],
  ["✨", "Explorer une démonstration", "Un parcours complet avec des données d’exemple.", "/how"],
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
  return <>{name ? `Bienvenue, ${name}` : "Bienvenue"}</>;
}

/* Comment veux-tu commencer ? (docs/prototype.html, scrOnb). */
export default function OnboardingPage() {
  return (
    <OnbFrame back="/">
      <div className={EYEBROW}>
        <Suspense fallback="Bienvenue">
          <Welcome />
        </Suspense>
      </div>
      <h1 className={H1}>Comment veux-tu commencer ?</h1>
      <p className="text-[15px] leading-normal text-muted">
        Tu peux ignorer n’importe quelle étape. Plus tu ajoutes de contexte, plus les réponses deviennent personnelles.
      </p>
      <div className="flex flex-col gap-2.5">
        {CHOICES.map(([icon, title, text, href]) => (
          <Link
            key={href}
            href={href}
            className="flex w-full items-center gap-3.5 rounded-card border-[1.5px] border-line bg-cream-2 p-4 text-left transition hover:-translate-y-px hover:border-ink"
          >
            <span aria-hidden className="inline-flex size-[42px] shrink-0 items-center justify-center rounded-[14px] bg-sand-2 text-[19px]">
              {icon}
            </span>
            <span>
              <span className="block font-bold">{title}</span>
              <span className="block text-[12.5px] text-muted">{text}</span>
            </span>
            <span aria-hidden className="ml-auto text-soft">
              ›
            </span>
          </Link>
        ))}
      </div>
      <div className="flex items-start gap-2.5 rounded-[14px] bg-sand-2 px-3.5 py-3 text-[13.5px] text-ink-2">
        <span aria-hidden className="shrink-0">
          🔒
        </span>
        <span>Privé par défaut. Rien n’est publié, aucun message n’est envoyé sans ta confirmation.</span>
      </div>
      <Link href="/sources" className="self-center text-[13.5px] font-semibold text-blue hover:underline">
        Voir toutes les sources possibles
      </Link>
    </OnbFrame>
  );
}
