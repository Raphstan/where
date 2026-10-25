import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authenticated, fail } from "@/lib/api";
import type { ReplySummary } from "@/lib/conversations/schema";

/**
 * GET /api/conversations/[id]/replies?since=ISO — réponses des proches reçues pour cette
 * conversation, sous RLS (seul l'auteur de la demande les lit). Interrogé régulièrement par le chat.
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/conversations/[id]/replies">) {
  const { id } = await ctx.params;
  if (!z.guid().safeParse(id).success) return fail(404, "not_found", "Conversation introuvable.");

  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour continuer.");

  const since = z.iso.datetime({ offset: true }).safeParse(request.nextUrl.searchParams.get("since"));

  let query = auth.supabase
    .from("request_replies")
    .select(
      "id, visited, reusable, created_at, place_text, place:places ( name ), recipient:request_recipients ( member:circle_members ( name ) ), request:requests!inner ( conversation_id )",
    )
    .eq("request.conversation_id", id)
    .order("created_at", { ascending: true });
  if (since.success) query = query.gt("created_at", since.data);

  const { data, error } = await query;
  if (error) return fail(503, "storage_unavailable", "Je n’arrive pas à lire les réponses.");

  const replies: ReplySummary[] = data.map((r) => ({
    id: r.id,
    memberName: r.recipient?.member?.name ?? "",
    placeName: r.place?.name ?? r.place_text ?? "",
    visited: r.visited,
    reusable: r.reusable,
    createdAt: r.created_at,
  }));
  return NextResponse.json({ replies });
}
