import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated, fail } from "@/lib/api";
import { saveUsagePrefs } from "@/lib/privacy/store";

const UsageSchema = z
  .object({ importedBookings: z.boolean(), visitFeedback: z.boolean(), circleReplies: z.boolean() })
  .partial()
  .strict();

/** PATCH /api/privacy — interrupteurs « Utilisé pour les recommandations ». */
export async function PATCH(request: Request) {
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour continuer.");

  const parsed = UsageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_usage", "Réglage invalide.");

  try {
    const usage = await saveUsagePrefs(auth.supabase, auth.user.id, parsed.data);
    return NextResponse.json({ usage });
  } catch {
    return fail(503, "storage_unavailable", "Je n’arrive pas à enregistrer ce réglage.");
  }
}
