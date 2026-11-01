import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { authenticated, fail } from "@/lib/api";
import { dueFollowups } from "@/lib/booking/store";

/**
 * GET /api/followups?conversationId= — retours après visite à proposer : rendus dus par le cron
 * (le lendemain de la réservation), pas encore répondus. Sans conversation : tous.
 */
export async function GET(request: NextRequest) {
  const t = translator(await apiLocale(), "booking");
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", t("api.unauthenticated"));

  const raw = request.nextUrl.searchParams.get("conversationId");
  const conversationId = raw === null ? null : z.guid().safeParse(raw);
  if (conversationId && !conversationId.success) return fail(404, "not_found", t("api.conversationNotFound"));

  try {
    const followups = await dueFollowups(auth.supabase, conversationId?.data ?? null);
    return NextResponse.json({ followups });
  } catch {
    return fail(503, "storage_unavailable", t("api.followupsFailed"));
  }
}
