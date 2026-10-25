import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { DeleteActions, UsageToggles } from "@/components/privacy/privacy-controls";
import { PageFrame } from "@/components/shell/page-frame";
import { privacyOverview } from "@/lib/privacy/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Confidentialité" };

const CARD = "rounded-card border border-line bg-cream-2 p-4";
const EYEBROW = "text-[11px] font-bold tracking-[0.14em] text-muted uppercase";

const PRINCIPLES = [
  "Privé par défaut",
  "Aucune publication publique automatique",
  "Aucune recommandation attribuée à un proche sans preuve",
  "Aucune lecture secrète des conversations",
  "Aucun message envoyé sans ta confirmation",
  "Contrôle total sur les connexions et la suppression",
];

function Kv({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line py-[11px] text-[13.5px] last:border-b-0">
      <span className="text-muted">{k}</span>
      <span className="text-right">{children}</span>
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

  return (
    <>
      <div className={CARD}>
        <div className={EYEBROW}>Données connectées</div>
        <Kv k="Transfert d’email">
          {o.emailSource
            ? `Emails transférés uniquement · ${o.confirmations} ${o.confirmations > 1 ? "confirmations" : "confirmation"}`
            : "Non connecté"}
        </Kv>
        <Kv k="Lieux importés">{o.importedPlaces}</Kv>
      </div>
      <div className={CARD}>
        <div className={EYEBROW}>Mon cercle</div>
        <Kv k="Personnes">{o.circleSize} · invisible pour elles</Kv>
        <Kv k="Ce qu’elles voient">Seulement les questions que tu leur envoies</Kv>
        <Kv k="Mes retours après visite">Privés, sauf partage explicite</Kv>
      </div>
      <div className={CARD}>
        <div className={EYEBROW}>Utilisé pour les recommandations</div>
        <UsageToggles initial={o.usage} />
      </div>
      <div className={`${CARD} flex flex-col gap-2`}>
        <div className={EYEBROW}>Supprimer</div>
        <DeleteActions emailSource={o.emailSource} importedPlaces={o.importedPlaces} />
      </div>
    </>
  );
}

/* Confidentialité (docs/prototype.html, scrPrivacy). */
export default function PrivacyPage() {
  return (
    <PageFrame
      title="Confidentialité"
      lead="Privé par défaut. Tu gardes le contrôle de chaque connexion et de chaque suppression."
      back="/profile"
    >
      <div className={CARD}>
        <div className={EYEBROW}>Principes</div>
        <div className="mt-2 flex flex-col gap-[9px] text-[13px] text-ink-2">
          {PRINCIPLES.map((t) => (
            <div key={t} className="flex items-start gap-2.5">
              <span className="shrink-0 text-olive">✓</span>
              {t}
            </div>
          ))}
        </div>
      </div>
      <Suspense fallback={<div className="h-[420px] animate-pulse rounded-card border border-line bg-cream-2" />}>
        <Overview />
      </Suspense>
    </PageFrame>
  );
}
