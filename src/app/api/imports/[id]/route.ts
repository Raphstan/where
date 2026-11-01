import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { authenticated, fail } from "@/lib/api";
import { QualificationSchema } from "@/lib/inbound/rules";
import { InboundError, qualifyEmail } from "@/lib/inbound/store";

/**
 * POST /api/imports/[id] — une carte de « Qualifier mes expériences » : les réponses, ou
 * « Ignorer ce lieu ». C'est cette validation, et elle seule, qui crée les signaux.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/imports/[id]">) {
  const { id } = await ctx.params;
  const t = translator(await apiLocale(), "api");
  if (!z.guid().safeParse(id).success) return fail(404, "not_found", t("imports.reservationNotFound"));

  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", t("unauthenticated"));

  const parsed = QualificationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", t("invalidAnswer"));

  try {
    const { levels } = await qualifyEmail(auth.supabase, auth.user.id, id, parsed.data);
    return NextResponse.json({ levels });
  } catch (error) {
    if (error instanceof InboundError) {
      if (error.code === "not_found") return fail(404, "not_found", t("imports.reservationNotFound"));
      if (error.code === "already_answered") return fail(409, "already_answered", t("imports.alreadyQualified"));
    }
    return fail(503, "storage_unavailable", t("imports.saveAnswerFailed"));
  }
}
