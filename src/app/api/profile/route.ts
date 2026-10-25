import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated, fail } from "@/lib/api";
import { saveProfile } from "@/lib/profile/store";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

const ProfileSchema = z.object({ name: text(60), city: text(80) });

/** PATCH /api/profile — prénom (utilisé dans « Raphaël cherche… ») et ville. */
export async function PATCH(request: Request) {
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour continuer.");
  const parsed = ProfileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_profile", "Vérifie les champs.");
  try {
    await saveProfile(auth.supabase, auth.user.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch {
    return fail(503, "storage_unavailable", "Je n’arrive pas à enregistrer ton profil.");
  }
}
