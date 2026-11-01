import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import type { T } from "@/i18n/translator";
import { authenticated, fail } from "@/lib/api";
import { FeedbackSchema, ShareSchema } from "@/lib/booking/followup";
import { answerFollowup, BookingError, shareFollowup } from "@/lib/booking/store";

function failFor(t: T, error: unknown, fallback: string) {
  if (error instanceof BookingError) {
    if (error.code === "not_found") return fail(404, "not_found", t("api.followupNotFound"));
    if (error.code === "already_answered") return fail(409, error.code, t("api.alreadyAnswered"));
    if (error.code === "no_signal") return fail(409, error.code, t("api.nothingToShare"));
  }
  return fail(503, "storage_unavailable", fallback);
}

/** POST /api/followups/[id] — les trois réponses du retour après visite. */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/followups/[id]">) {
  const { id } = await ctx.params;
  const t = translator(await apiLocale(), "booking");
  if (!z.guid().safeParse(id).success) return fail(404, "not_found", t("api.followupNotFound"));

  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", t("api.unauthenticated"));

  const parsed = FeedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", t("api.invalidAnswer"));

  try {
    const { level } = await answerFollowup(auth.supabase, auth.user.id, id, parsed.data);
    return NextResponse.json({ level });
  } catch (error) {
    return failFor(t, error, t("api.feedbackFailed"));
  }
}

/** PATCH /api/followups/[id] — « Partager ce retour avec mon cercle privé » (désactivé par défaut). */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/followups/[id]">) {
  const { id } = await ctx.params;
  const t = translator(await apiLocale(), "booking");
  if (!z.guid().safeParse(id).success) return fail(404, "not_found", t("api.followupNotFound"));

  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", t("api.unauthenticated"));

  const parsed = ShareSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", t("api.invalidAnswer"));

  try {
    await shareFollowup(auth.supabase, id, parsed.data.shared);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return failFor(t, error, t("api.shareFailed"));
  }
}
