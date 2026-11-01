"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { LEGAL_VERSION } from "@/content/legal";
import { apiLocale } from "@/i18n/request-locale";
import { ensureBetaAccount } from "@/lib/auth/beta-access";
import { TERMS_COOKIE } from "@/lib/auth/terms";
import { NEXT_COOKIE, NEXT_COOKIE_MAX_AGE, safeNextPath } from "@/lib/auth/redirect";
import { publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export type MagicLinkState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  /** Bêta privée : ni compte, ni invitation, ni lien de proche. Aucun email n'est envoyé. */
  | { status: "waitlist"; email: string }
  /** Clé du message (messages/{langue}/login.json, `errors.*`) : le formulaire le traduit. */
  | { status: "error"; error: "invalidEmail" | "sendFailed" | "termsRequired" };

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  next: z.string().optional(),
  terms: z.literal("on").optional(),
});

/** Envoie un lien magique. Aucun mot de passe : le lien reçu par email connecte l'utilisateur. */
export async function sendMagicLink(
  _previous: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const parsed = schema.safeParse({
    email: formData.get("email"),
    next: formData.get("next") ?? undefined,
    terms: formData.get("terms") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", error: "invalidEmail" };
  }

  const { email, next } = parsed.data;
  const acceptedTerms = parsed.data.terms === "on";
  const redirectTo = new URL("/auth/confirm", publicEnv.NEXT_PUBLIC_SITE_URL);
  if (next) redirectTo.searchParams.set("next", next);

  // Bêta privée : le compte n'est créé (côté serveur) que pour une personne invitée.
  let access;
  try {
    access = await ensureBetaAccount(email, next, acceptedTerms, await apiLocale());
  } catch {
    return { status: "error", error: "sendFailed" };
  }
  if (access === "waitlist") return { status: "waitlist", email };
  if (access === "termsRequired") return { status: "error", error: "termsRequired" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo.toString(), shouldCreateUser: false },
  });

  if (error) {
    return { status: "error", error: "sendFailed" };
  }

  // La page demandée survit au détour par la boîte mail (voir /auth/confirm).
  const jar = await cookies();
  // Sur cet appareil, la case n'est plus redemandée tant que la version des conditions ne change pas.
  if (acceptedTerms) {
    jar.set(TERMS_COOKIE, LEGAL_VERSION, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
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
