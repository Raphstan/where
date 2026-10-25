import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authenticated, fail } from "@/lib/api";
import { UpdateConversationSchema } from "@/lib/conversations/schema";

/** PATCH /api/conversations/[id] — critères modifiés (chip retirée ou ajoutée). */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/conversations/[id]">) {
  const { id } = await ctx.params;
  if (!z.guid().safeParse(id).success) return fail(404, "not_found", "Conversation introuvable.");

  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour continuer.");

  const parsed = UpdateConversationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", "Critères invalides.");

  const { data, error } = await auth.supabase
    .from("conversations")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return fail(503, "storage_unavailable", "Je n’arrive pas à mettre à jour cette conversation.");
  if (data.length === 0) return fail(404, "not_found", "Conversation introuvable.");
  return new NextResponse(null, { status: 204 });
}
