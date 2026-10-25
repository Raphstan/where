import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { ChatScreen } from "@/components/chat/chat-screen";
import { loadConversation } from "@/lib/conversations/load";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Conversation" };

async function StoredChat({ id }: { id: string }) {
  await connection();
  if (!z.guid().safeParse(id).success) notFound();
  const supabase = await createClient();
  const conversation = await loadConversation(supabase, id);
  if (!conversation) notFound();
  return <ChatScreen key={conversation.id} initial={conversation} />;
}

/* Conversation enregistrée : on y revient quand un proche répond (docs/prototype.html, scrChat). */
export default function ConversationPage({ params }: PageProps<"/chat/[id]">) {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      {params.then(({ id }) => (
        <StoredChat id={id} />
      ))}
    </Suspense>
  );
}
