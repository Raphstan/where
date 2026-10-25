import { NextResponse, type NextRequest } from "next/server";
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "unauthenticated", "Connecte-toi pour lancer une recherche.");

  const json = await request.json().catch(() => null);
  const parsed = SearchRequestSchema.safeParse(json);
  if (!parsed.success) return fail(400, "invalid_request", "Critères manquants ou invalides.");

  try {
    const response = await search(parsed.data.criteria, {
      supabase,
      userId: user.id,
      googlePlacesApiKey: getServerEnv().GOOGLE_PLACES_API_KEY,
      conversationId: parsed.data.conversationId ?? null,
    });
    return NextResponse.json<SearchResponse>(response);
  } catch (error) {
    if (error instanceof SearchError) {
      return fail(503, "memory_unavailable", "Je n’arrive pas à lire ta mémoire. Réessaie dans un instant.");
    }
    throw error;
  }
}
