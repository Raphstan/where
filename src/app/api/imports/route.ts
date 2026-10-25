import { NextResponse } from "next/server";
import { authenticated, fail } from "@/lib/api";
import { deleteImportedPlaces } from "@/lib/privacy/store";

/**
 * DELETE /api/imports — « Supprimer tous les lieux importés ». Les recommandations manuelles, les
 * retours après visite et les réponses du cercle sont conservés.
 */
export async function DELETE() {
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour continuer.");
  try {
    const removed = await deleteImportedPlaces(auth.supabase);
    return NextResponse.json({ removed });
  } catch {
    return fail(503, "storage_unavailable", "Je n’arrive pas à supprimer ces lieux.");
  }
}
