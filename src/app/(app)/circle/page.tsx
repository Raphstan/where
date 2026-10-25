import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddPersonButton } from "@/components/circle/add-person";
import { PersonCard } from "@/components/circle/person-card";
import { PageFrame } from "@/components/shell/page-frame";
import { listCircle } from "@/lib/circle/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mon cercle" };

async function People() {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const members = await listCircle(supabase, user.id);
  return members.map((m) => <PersonCard key={m.id} member={m} />);
}

/* Mon cercle (docs/prototype.html, scrCircleSetup(false)). */
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
      <Suspense fallback={<div className="h-[150px] animate-pulse rounded-card border border-line bg-cream-2" />}>
        <People />
      </Suspense>
      <AddPersonButton />
    </PageFrame>
  );
}
