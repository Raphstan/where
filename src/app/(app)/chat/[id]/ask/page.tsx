import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { AskComposer } from "@/components/network/ask-composer";
import { loadConversation } from "@/lib/conversations/load";
import { draftMessage } from "@/lib/network/message";
import { suggestPeople } from "@/lib/network/suggest";
import { loadMemory } from "@/lib/search/search";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Demander à mon réseau" };

async function Ask({ id }: { id: string }) {
  await connection();
  if (!z.guid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const [conversation, memory, profile] = await Promise.all([
    loadConversation(supabase, id),
    loadMemory(supabase, user.id),
    supabase.from("users").select("display_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!conversation) notFound();

  // Tout le cercle est proposé, les plus pertinents d'abord ; seuls ceux-là sont cochés.
  const candidates = suggestPeople(memory.members, memory.rows, conversation.criteria, Number.POSITIVE_INFINITY);

  return (
    <AskComposer
      conversationId={conversation.id}
      draft={draftMessage(conversation.criteria, profile.data?.display_name ?? null)}
      candidates={candidates}
    />
  );
}

/* Demander à mon réseau (docs/prototype.html, scrAsk). */
export default function AskPage({ params }: PageProps<"/chat/[id]/ask">) {
  return (
    <div className="px-[22px] pt-3 pb-7 lg:px-9 lg:pt-7">
      <div className="mx-auto w-full max-w-[600px]">
        <Suspense fallback={<div className="h-[480px] animate-pulse rounded-card bg-cream-2" />}>
          {params.then(({ id }) => (
            <Ask id={id} />
          ))}
        </Suspense>
      </div>
    </div>
  );
}
