import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { authenticated, fail } from "@/lib/api";
import { UpdateConversationSchema } from "@/lib/conversations/schema";

/** PATCH /api/conversations/[id] — critères modifiés (chip retirée ou ajoutée). */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/conversations/[id]">) {
  const t = translator(await apiLocale(), "chat");
  const { id } = await ctx.params;
  if (!z.guid().safeParse(id).success) return fail(404, "not_found", t("api.conversations.notFound"));

  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", t("api.conversations.signIn"));

  const parsed = UpdateConversationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", t("api.conversations.invalidCriteria"));

  const { data, error } = await auth.supabase
    .from("conversations")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return fail(503, "storage_unavailable", t("api.conversations.updateFailed"));
  if (data.length === 0) return fail(404, "not_found", t("api.conversations.notFound"));
  return new NextResponse(null, { status: 204 });
}
