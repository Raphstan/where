import { NextResponse, type NextRequest } from "next/server";
import { authenticated, fail } from "@/lib/api";
import { CreateConversationSchema } from "@/lib/conversations/schema";

/** POST /api/conversations — enregistre la question et ses critères, pour pouvoir y revenir. */
export async function POST(request: NextRequest) {
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour poser une question.");

  const parsed = CreateConversationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", "Conversation invalide.");

  const { data, error } = await auth.supabase
    .from("conversations")
    .insert({ user_id: auth.user.id, ...parsed.data })
    .select("id")
    .single();
  if (error) return fail(503, "storage_unavailable", "Je n’arrive pas à garder cette conversation.");
  return NextResponse.json({ id: data.id }, { status: 201 });
}
