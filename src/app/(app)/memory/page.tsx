import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = { title: "Ma mémoire" };

export default function MemoryPage() {
  return (
    <PageFrame
      title="Ma mémoire"
      lead="Les lieux que tu connais, et ceux que ton cercle t'a recommandés."
    >
      <div className="rounded-card border border-line bg-cream-2 p-4 shadow-soft">
        <p className="text-[12.5px] text-muted">
          Ta mémoire est encore vide. Elle se remplira avec tes réservations, tes retours et les
          réponses de ton cercle.
        </p>
        <Link href="/import" className="mt-2 inline-block text-[12.5px] font-semibold text-blue hover:underline">
          Retrouver mes anciennes réservations →
        </Link>
      </div>
      <p className="text-center text-[11.5px] text-soft">
        Cette section reste secondaire. Le chat demeure le point d&apos;entrée.
      </p>
    </PageFrame>
  );
}
