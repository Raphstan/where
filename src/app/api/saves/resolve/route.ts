import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { getServerEnv } from "@/lib/env.server";
import { consumeMyQuota } from "@/lib/quota";
import type { SaveCandidate } from "@/lib/saves/candidate";
import { findSharedLink, type LinkSource } from "@/lib/saves/link";
import { resolveLink } from "@/lib/saves/resolve";
import { createClient } from "@/lib/supabase/server";

type ErrorBody = { error: { code: string; message: string } };
export type ResolveSaveResponse = { candidate: SaveCandidate | null; source: LinkSource };

function fail(status: number, code: string, message: string) {
  return NextResponse.json<ErrorBody>({ error: { code, message } }, { status });
}

const BodySchema = z.object({ message: z.string().trim().min(1).max(1000) });

/**
 * POST /api/saves/resolve — un message contenant un lien (Google Maps, TikTok, Instagram, site) →
 * le lieu qu'il désigne, à confirmer par l'utilisateur. Rien n'est enregistré ici.
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
  const link = parsed.success ? findSharedLink(parsed.data.message) : null;
  if (!link) return fail(400, "invalid_request", t("api.save.invalid"));

  if (!(await consumeMyQuota(supabase, "save"))) return fail(429, "quota_exceeded", t("api.quotaExceeded"));

  try {
    const candidate = await resolveLink(link, { googlePlacesApiKey: getServerEnv().GOOGLE_PLACES_API_KEY });
    return NextResponse.json<ResolveSaveResponse>({ candidate, source: link.source });
  } catch (error) {
    console.error("[saves/resolve]", error instanceof Error ? error.message : error);
    return fail(502, "upstream_error", t("api.save.readFailed"));
  }
}
