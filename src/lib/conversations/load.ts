import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Criteria } from "@/lib/ask/schema";
import type { Database } from "@/lib/supabase/database.types";
import { StoredCriteriaSchema, type ReplySummary } from "./schema";

/** Une demande envoyée : les proches pour qui WhatsApp a été ouvert, et ceux qui ont répondu. */
export type AskedSummary = { requestId: string; sentTo: string[]; pending: number; createdAt: string };

export type StoredConversation = {
  id: string;
  question: string;
  tags: string[];
  criteria: Criteria;
  asked: AskedSummary[];
  replies: ReplySummary[];
};

/** Lit une conversation, ses demandes et les réponses reçues, sous RLS. null si introuvable. */
export async function loadConversation(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<StoredConversation | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select(
      `id, question, tags, criteria,
       requests ( id, created_at,
         recipients:request_recipients ( sent_at, replied_at, member:circle_members ( name ) ),
         replies:request_replies ( id, visited, reusable, created_at, place_text,
           place:places ( name ), recipient:request_recipients ( member:circle_members ( name ) ) ) )`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const criteria = StoredCriteriaSchema.safeParse(data.criteria);
  if (!criteria.success) return null;

  const requests = [...data.requests].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return {
    id: data.id,
    question: data.question,
    tags: data.tags,
    criteria: criteria.data,
    asked: requests.map((r) => {
      const sent = r.recipients.filter((x) => x.sent_at !== null);
      return {
        requestId: r.id,
        sentTo: sent.map((x) => x.member?.name ?? "").filter(Boolean),
        pending: sent.filter((x) => x.replied_at === null).length,
        createdAt: r.created_at,
      };
    }),
    replies: requests
      .flatMap((r) => r.replies)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((r) => ({
        id: r.id,
        memberName: r.recipient?.member?.name ?? "",
        placeName: r.place?.name ?? r.place_text ?? "",
        visited: r.visited,
        reusable: r.reusable,
        createdAt: r.created_at,
      })),
  };
}
