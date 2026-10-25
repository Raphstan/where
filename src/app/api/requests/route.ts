import { NextResponse, type NextRequest } from "next/server";
import { authenticated, fail } from "@/lib/api";
import { CreateRequestSchema, type CreateRequestResponse } from "@/lib/conversations/schema";
import { publicEnv } from "@/lib/env";
import { replyLink, waMeUrl, whatsappText } from "@/lib/network/message";

/**
 * POST /api/requests — après l'écran de confirmation, enregistre la demande et crée un lien privé
 * par proche. Rien n'est envoyé par le serveur : la réponse contient des liens wa.me que
 * l'utilisateur ouvre lui-même, un par un.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour demander à ton cercle.");

  const parsed = CreateRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", "Message ou destinataires invalides.");
  const { conversationId, message, recipientIds } = parsed.data;
  const { supabase, user } = auth;

  const [conversation, members] = await Promise.all([
    supabase.from("conversations").select("id, question").eq("id", conversationId).maybeSingle(),
    supabase.from("circle_members").select("id, name, phone").in("id", recipientIds),
  ]);
  if (conversation.error || members.error) return fail(503, "storage_unavailable", "Je n’arrive pas à préparer la demande.");
  if (!conversation.data) return fail(404, "not_found", "Conversation introuvable.");
  // Sous RLS, seuls les membres du cercle de l'utilisateur sont lisibles.
  if (members.data.length !== new Set(recipientIds).size) {
    return fail(400, "not_in_circle", "Un des destinataires ne fait pas partie de ton cercle.");
  }

  const created = await supabase
    .from("requests")
    .insert({ user_id: user.id, conversation_id: conversationId, question: conversation.data.question, message })
    .select("id")
    .single();
  if (created.error) return fail(503, "storage_unavailable", "Je n’arrive pas à préparer la demande.");

  const recipients = await supabase
    .from("request_recipients")
    .insert(recipientIds.map((id) => ({ request_id: created.data.id, circle_member_id: id })))
    .select("id, token, circle_member_id");
  if (recipients.error) return fail(503, "storage_unavailable", "Je n’arrive pas à préparer la demande.");

  const byId = new Map(members.data.map((m) => [m.id, m]));
  const body: CreateRequestResponse = {
    requestId: created.data.id,
    // Dans l'ordre choisi par l'utilisateur.
    recipients: recipientIds.flatMap((memberId) => {
      const r = recipients.data.find((x) => x.circle_member_id === memberId);
      const m = byId.get(memberId);
      if (!r || !m) return [];
      const link = replyLink(publicEnv.NEXT_PUBLIC_SITE_URL, r.token);
      return [{ id: r.id, memberId, name: m.name, link, waUrl: waMeUrl(m.phone, whatsappText(message, link)) }];
    }),
  };
  return NextResponse.json(body, { status: 201 });
}
