import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { SaveCandidateSchema } from "@/lib/saves/candidate";
import { saveCandidate, SaveError } from "@/lib/saves/store";
import { createClient } from "@/lib/supabase/server";

type ErrorBody = { error: { code: string; message: string } };
export type SaveResponse = { already: boolean; count: number };

function fail(status: number, code: string, message: string) {
  return NextResponse.json<ErrorBody>({ error: { code, message } }, { status });
}

const BodySchema = z.object({ candidate: SaveCandidateSchema });

/**
 * POST /api/saves — garde dans la mémoire le lieu que l'utilisateur vient de confirmer, au niveau
 * « Sauvegardé ». Sous RLS : le signal appartient à l'utilisateur connecté.
 */
export async function POST(request: NextRequest) {
  const locale = await apiLocale();
  const t = translator(locale, "chat");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "unauthenticated", t("api.save.unauthenticated"));

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", t("api.save.invalid"));

  try {
    return NextResponse.json<SaveResponse>(await saveCandidate(supabase, user.id, parsed.data.candidate));
  } catch (error) {
    if (error instanceof SaveError) {
      console.error("[saves]", error.message);
      return fail(500, "storage_unavailable", t("api.save.saveFailed"));
    }
    throw error;
  }
}
