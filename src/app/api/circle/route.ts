import { NextResponse } from "next/server";
import { authenticated, fail } from "@/lib/api";
import { NewMemberSchema } from "@/lib/circle/member";
import { addMember } from "@/lib/circle/store";

/** POST /api/circle — « Ajouter une personne ». Aucun message n'est envoyé à la personne. */
export async function POST(request: Request) {
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour continuer.");

  const parsed = NewMemberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_member", parsed.error.issues[0]?.message ?? "Vérifie les champs.");

  try {
    const id = await addMember(auth.supabase, auth.user.id, parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return fail(503, "storage_unavailable", "Je n’arrive pas à enregistrer cette personne.");
  }
}
