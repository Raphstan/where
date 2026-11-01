import { NextResponse, type NextRequest } from "next/server";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { getServerEnv } from "@/lib/env.server";
import { SearchRequestSchema } from "@/lib/search/request";
import { search, SearchError } from "@/lib/search/search";
import type { SearchResponse } from "@/lib/search/types";
import { createClient } from "@/lib/supabase/server";

type ErrorBody = { error: { code: string; message: string } };

function fail(status: number, code: string, message: string) {
  return NextResponse.json<ErrorBody>({ error: { code, message } }, { status });
}

/**
 * POST /api/search — critères compris → au plus trois lieux classés, avec leurs preuves.
 * Lit la mémoire de l'utilisateur sous RLS, complète avec au plus une découverte Google Places.
 */
export async function POST(request: NextRequest) {
  const locale = await apiLocale();
  const t = translator(locale, "chat");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "unauthenticated", t("api.search.unauthenticated"));

  const json = await request.json().catch(() => null);
  const parsed = SearchRequestSchema.safeParse(json);
  if (!parsed.success) return fail(400, "invalid_request", t("api.search.invalid"));

  try {
    const response = await search(parsed.data.criteria, {
      tr: { t: translator(locale, "search"), ev: translator(locale, "evidence") },
      network: translator(locale, "network"),
      locale,
      supabase,
      userId: user.id,
      googlePlacesApiKey: getServerEnv().GOOGLE_PLACES_API_KEY,
      conversationId: parsed.data.conversationId ?? null,
    });
    return NextResponse.json<SearchResponse>(response);
  } catch (error) {
    if (error instanceof SearchError) {
      return fail(503, "memory_unavailable", t("api.search.memory"));
    }
    throw error;
  }
}
