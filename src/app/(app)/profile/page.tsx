import type { Metadata } from "next";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilePage() {
  return (
    <PageFrame title="Profil" lead="Tes préférences apprises, tes sources et ta confidentialité.">
      <div className="rounded-card border border-line bg-cream-2 p-4 shadow-soft">
        <div className="mb-2 text-[11px] font-bold tracking-[0.14em] text-muted uppercase">
          Mes préférences apprises
        </div>
        <p className="text-[12.5px] text-muted">
          WHERE n&apos;a encore rien appris. Tes préférences apparaîtront ici au fil de tes questions.
        </p>
      </div>
    </PageFrame>
  );
}
