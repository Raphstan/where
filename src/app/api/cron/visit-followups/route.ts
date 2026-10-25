import { NextResponse, type NextRequest } from "next/server";
import { fail } from "@/lib/api";
import { isCronAuthorized } from "@/lib/booking/cron";
import { getServerEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/cron/visit-followups — tâche planifiée Vercel (vercel.json), une fois par jour.
 * Rend « dus » les retours après visite dont l'échéance (le lendemain de la réservation) est passée :
 * l'app les propose alors dans le chat. Ne lit ni n'écrit rien d'autre ; aucune donnée renvoyée.
 * Seul usage de service_role hors page invité : la tâche n'a pas de session utilisateur.
 */
export async function GET(request: NextRequest) {
  const env = getServerEnv();
  if (!isCronAuthorized(request.headers.get("authorization"), env.CRON_SECRET)) {
    return fail(401, "unauthorized", "Accès réservé à la tâche planifiée.");
  }

  const now = new Date().toISOString();
  const { data, error } = await createAdminClient()
    .from("visit_followups")
    .update({ prompted_at: now })
    .is("prompted_at", null)
    .is("answered_at", null)
    .lte("due_at", now)
    .select("id");
  if (error) return fail(503, "storage_unavailable", "Mise à jour des retours impossible.");
  return NextResponse.json({ prompted: data.length });
}
