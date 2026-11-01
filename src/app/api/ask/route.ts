import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { getServerEnv } from "@/lib/env.server";
import { mockUnderstanding } from "@/lib/ask/mock";
import { AskRequestSchema, type AskResponse } from "@/lib/ask/schema";
import { UnderstandError, understandQuestion } from "@/lib/ask/understand";
import { createClient } from "@/lib/supabase/server";

type ErrorBody = { error: { code: string; message: string } };

function fail(status: number, code: string, message: string) {
  return NextResponse.json<ErrorBody>({ error: { code, message } }, { status });
}

/**
 * POST /api/ask — transforme une question en critères compris (+ éventuelle question de précision).
 * Réservé aux utilisateurs connectés. Pas encore de résultats : la réponse s'arrête aux critères.
 */
export async function POST(request: NextRequest) {
  const locale = await apiLocale();
  const t = translator(locale, "chat");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "unauthenticated", t("api.ask.unauthenticated"));

  const json = await request.json().catch(() => null);
  const parsed = AskRequestSchema.safeParse(json);
  if (!parsed.success) return fail(400, "invalid_request", t("api.ask.invalid"));

  const env = getServerEnv();
  if (env.WHERE_ASK_MOCK && process.env.NODE_ENV !== "production") {
    return NextResponse.json<AskResponse>({ understanding: mockUnderstanding(parsed.data) });
  }

  try {
    const understanding = await understandQuestion(parsed.data, undefined, locale);
    return NextResponse.json<AskResponse>({ understanding });
  } catch (error) {
    if (error instanceof UnderstandError) {
      if (error.code === "missing_api_key") {
        return fail(500, "not_configured", t("api.ask.notConfigured"));
      }
      return fail(422, error.code, t("api.ask.unparseable"));
    }
    if (error instanceof Anthropic.RateLimitError) {
      return fail(429, "rate_limited", t("api.ask.rateLimited"));
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return fail(500, "not_configured", t("api.ask.notConfigured"));
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return fail(503, "upstream_unreachable", t("api.ask.unreachable"));
    }
    if (error instanceof Anthropic.APIError) {
      return fail(502, "upstream_error", t("api.ask.upstream"));
    }
    throw error;
  }
}
