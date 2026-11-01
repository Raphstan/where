import { NextResponse } from "next/server";
import { z } from "zod";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { authenticated, fail } from "@/lib/api";
import { saveUsagePrefs } from "@/lib/privacy/store";

const UsageSchema = z
  .object({ importedBookings: z.boolean(), visitFeedback: z.boolean(), circleReplies: z.boolean() })
  .partial()
  .strict();

/** PATCH /api/privacy — interrupteurs « Utilisé pour les recommandations ». */
export async function PATCH(request: Request) {
  const t = translator(await apiLocale(), "privacy");
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", t("api.unauthenticated"));

  const parsed = UsageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_usage", t("api.invalidUsage"));

  try {
    const usage = await saveUsagePrefs(auth.supabase, auth.user.id, parsed.data);
    return NextResponse.json({ usage });
  } catch {
    return fail(503, "storage_unavailable", t("api.saveUsageFailed"));
  }
}
