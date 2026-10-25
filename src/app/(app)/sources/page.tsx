import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { EmailSourceActions } from "@/components/privacy/email-source";
import { PageFrame } from "@/components/shell/page-frame";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mes sources" };

const CARD = "flex flex-col gap-2 rounded-card border border-line bg-cream-2 p-4";
const BADGE = {
  ok: "bg-olive-2 text-olive",
  off: "bg-sand-2 text-muted",
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
 * Sources pas encore disponibles au MVP : descriptions de la maquette (scrSources), badge « Bientôt ».
 * Seul le transfert d'email est actif (CLAUDE.md § 5).
 */
const LATER: readonly { logo: [string, string]; name: string; text: string }[] = [
  {
    logo: ["bg-[#5bc236] text-white", "S"],
    name: "SMS",
    text: "Dépend des autorisations de ton téléphone. Une web app ne peut pas lire librement tes SMS. Utile pour Ontopo, qui confirme souvent par SMS.",
  },
  {
    logo: ["bg-[#25d366] text-white", "W"],
    name: "WhatsApp",
    text: "WHERE ne peut pas lire tes conversations. Il utilise seulement : les messages que tu transfères, les liens envoyés au bot, les réponses reçues via un lien WHERE, ou une conversation que tu inities.",
  },
  {
    logo: ["bg-linear-45 from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white", "I"],
    name: "Instagram",
    text: "Pas d’accès à tes messages privés ni à tes collections. Tu partages volontairement un post, un Reel, un profil de lieu ou un lien.",
  },
  {
    logo: ["bg-[#111111] text-white", "T"],
    name: "TikTok",
    text: "Même logique : partage volontaire d’un lien ou d’une vidéo.",
  },
  {
    logo: ["bg-[#34a853] text-white", "G"],
    name: "Google Maps",
    text: "Liens partagés, données publiques sur les lieux, et intégrations autorisées le cas échéant.",
  },
];

const PLATFORMS = ["Ontopo", "Tabit", "Resy", "OpenTable", "Restu", "Google Reserve", "Sites directs"];

async function EmailSource() {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.from("forward_addresses").select("user_id").maybeSingle();
  const connected = data !== null;
  return (
    <div className={CARD}>
      <Head
        logo={["border border-line bg-white text-[#d44638]", "M"]}
        name="Transfert d’email"
        badge={connected ? "ok" : "off"}
        status={connected ? "Connecté · emails transférés uniquement" : "Non connecté"}
      />
      <p className="text-[12.5px] text-muted">
        Détecte les confirmations de réservation et certains signaux post-visite (ex. « merci pour votre visite ») dans
        les emails que tu transfères, à la main ou par un filtre Gmail qui ne vise que les plateformes de réservation.
        Jamais les emails personnels.
      </p>
      <EmailSourceActions connected={connected} />
    </div>
  );
}

/* Mes sources (docs/prototype.html, scrSources). */
export default function SourcesPage() {
  return (
    <PageFrame title="Mes sources" lead="Ce que WHERE peut vraiment lire, et ce qu’il ne lira jamais." back="/profile">
      <Suspense fallback={<div className="h-[150px] animate-pulse rounded-card border border-line bg-cream-2" />}>
        <EmailSource />
      </Suspense>
      {LATER.map((s) => (
        <div key={s.name} className={CARD}>
          <Head logo={s.logo} name={s.name} badge="soon" status="Bientôt" />
          <p className="text-[12.5px] text-muted">{s.text}</p>
        </div>
      ))}
      <div className={CARD}>
        <h2 className="text-[15px] font-bold">Plateformes de réservation</h2>
        <div className="flex flex-wrap gap-1.5">
          {PLATFORMS.map((p) => (
            <span key={p} className="inline-flex rounded-full border-[1.5px] border-line bg-cream-2 px-3 py-[7px] text-[12px] font-medium">
              {p}
            </span>
          ))}
        </div>
        <p className="text-[12.5px] text-muted">
          Ce sont des destinations, pas des sources illimitées : leur disponibilité dépend du pays, du lieu et des
          intégrations possibles. WHERE t’y envoie, il ne réserve pas à ta place.
        </p>
      </div>
    </PageFrame>
  );
}
