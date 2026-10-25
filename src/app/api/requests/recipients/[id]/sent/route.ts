import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { authenticated, fail } from "@/lib/api";

/**
 * POST /api/requests/recipients/[id]/sent — l'utilisateur a ouvert WhatsApp pour ce proche.
 * Simple trace (sent_at) : l'envoi lui-même se fait dans WhatsApp, par l'utilisateur.
 */
export async function POST(_request: NextRequest, ctx: RouteContext<"/api/requests/recipients/[id]/sent">) {
  const { id } = await ctx.params;
  if (!z.guid().safeParse(id).success) return fail(404, "not_found", "Destinataire introuvable.");

  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour continuer.");

  const { error } = await auth.supabase
    .from("request_recipients")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", id)
    .is("sent_at", null);
  if (error) return fail(503, "storage_unavailable", "Je n’arrive pas à enregistrer l’envoi.");
  return new NextResponse(null, { status: 204 });
}
