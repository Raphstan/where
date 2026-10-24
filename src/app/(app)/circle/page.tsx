import type { Metadata } from "next";
import { PageFrame } from "@/components/shell/page-frame";

export const metadata: Metadata = { title: "Mon cercle" };

export default function CirclePage() {
  return (
    <PageFrame
      title="Mon cercle"
      lead="Une personne n'est pas forcément pertinente pour tous les sujets. Choisis sur quoi tu fais confiance à chacun."
    >
      <div className="flex items-start gap-2.5 rounded-[14px] bg-sand-2 px-3.5 py-3 text-[13.5px] text-ink-2">
        <span aria-hidden className="shrink-0">
          🔒
        </span>
        <span>Ce cercle est privé. Personne ne voit qu&apos;il en fait partie, et rien n&apos;est publié.</span>
      </div>
    </PageFrame>
  );
}
