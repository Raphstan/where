"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { NEXT_COOKIE, NEXT_COOKIE_MAX_AGE, safeNextPath } from "@/lib/auth/redirect";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  next: z.string().optional(),
});

/** Envoie un lien magique. Aucun mot de passe : le lien reçu par email connecte l'utilisateur. */
export async function sendMagicLink(
  _previous: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Entre une adresse email valide." };
  }

  const { email, next } = parsed.data;
  const redirectTo = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_SITE_URL);
  if (next) redirectTo.searchParams.set("next", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo.toString(), shouldCreateUser: true },
  });

  if (error) {
    return {
      status: "error",
      message: "Impossible d'envoyer le lien pour l'instant. Réessaie dans un instant.",
    };
  }

  // La page demandée survit au détour par la boîte mail (voir /auth/confirm).
  const jar = await cookies();
  if (next) {
    jar.set(NEXT_COOKIE, safeNextPath(next), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: NEXT_COOKIE_MAX_AGE,
      path: "/",
    });
  } else {
    jar.delete(NEXT_COOKIE);
  }

  return { status: "sent", email };
}
