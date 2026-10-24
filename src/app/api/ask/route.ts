import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "unauthenticated", "Connecte-toi pour poser une question.");

  const json = await request.json().catch(() => null);
  const parsed = AskRequestSchema.safeParse(json);
  if (!parsed.success) return fail(400, "invalid_request", "Question manquante ou trop longue.");

  const env = getServerEnv();
  if (env.WHERE_ASK_MOCK && process.env.NODE_ENV !== "production") {
    return NextResponse.json<AskResponse>({ understanding: mockUnderstanding(parsed.data) });
  }

  try {
    const understanding = await understandQuestion(parsed.data);
    return NextResponse.json<AskResponse>({ understanding });
  } catch (error) {
    if (error instanceof UnderstandError) {
      if (error.code === "missing_api_key") {
        return fail(500, "not_configured", "WHERE n'est pas encore configuré pour comprendre les questions.");
      }
      return fail(422, error.code, "Je n'ai pas réussi à comprendre la question. Reformule-la ?");
    }
    if (error instanceof Anthropic.RateLimitError) {
      return fail(429, "rate_limited", "Trop de questions d'un coup. Réessaie dans un instant.");
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return fail(500, "not_configured", "WHERE n'est pas encore configuré pour comprendre les questions.");
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return fail(503, "upstream_unreachable", "Je n'arrive pas à joindre mon moteur. Réessaie dans un instant.");
    }
    if (error instanceof Anthropic.APIError) {
      return fail(502, "upstream_error", "Mon moteur a répondu de travers. Réessaie dans un instant.");
    }
    throw error;
  }
}
