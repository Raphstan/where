import { NextResponse } from "next/server";
import { authenticated, fail } from "@/lib/api";
import { deleteAccount } from "@/lib/privacy/store";

/** DELETE /api/account — « Supprimer mon compte » : définitif, puis la session est fermée. */
export async function DELETE() {
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour continuer.");
  try {
    await deleteAccount(auth.supabase);
  } catch {
    return fail(503, "storage_unavailable", "Je n’arrive pas à supprimer ton compte.");
  }
  // Le compte n'existe plus : on efface seulement les cookies de session, localement.
  await auth.supabase.auth.signOut({ scope: "local" });
  return NextResponse.json({ ok: true });
}
