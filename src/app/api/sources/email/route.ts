import { NextResponse } from "next/server";
import { authenticated, fail } from "@/lib/api";
import { deleteEmailSource, restoreEmailSource } from "@/lib/privacy/store";

/** DELETE /api/sources/email — supprime l'adresse de transfert et les emails reçus. Les lieux restent. */
export async function DELETE() {
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour continuer.");
  try {
    await deleteEmailSource(auth.supabase, auth.user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return fail(503, "storage_unavailable", "Je n’arrive pas à supprimer cette source.");
  }
}

/** POST /api/sources/email — rétablit la source, avec une nouvelle adresse. */
export async function POST() {
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour continuer.");
  try {
    await restoreEmailSource(auth.supabase, auth.user.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return fail(503, "storage_unavailable", "Je n’arrive pas à connecter cette source.");
  }
}
