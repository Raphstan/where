"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { LEGAL_VERSION } from "@/content/legal";
import { apiLocale } from "@/i18n/request-locale";
import { ensureBetaAccount } from "@/lib/auth/beta-access";
import { TERMS_COOKIE } from "@/lib/auth/terms";
import { verifyGoogleIdToken } from "@/lib/auth/google";
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

export type GoogleSignInResult =
  | { status: "signedIn"; next: string }
  | { status: "waitlist"; email: string }
  | { status: "error"; error: "googleFailed" | "termsRequired" };

const googleSchema = z.object({
  credential: z.string().min(1).max(8192),
  nonce: z.string().min(16).max(128),
  next: z.string().optional(),
  terms: z.boolean(),
});

/**
 * « Continuer avec Google » : le bouton Google (Google Identity Services) remet un jeton d'identité.
 * Mêmes règles que le lien magique : l'email (vérifié par Google) passe par ensureBetaAccount, qui
 * décide l'accès à la bêta et crée le compte d'une personne invitée. Supabase relie ensuite
 * l'identité Google au compte qui porte le même email (signInWithIdToken).
 */
export async function signInWithGoogle(input: z.input<typeof googleSchema>): Promise<GoogleSignInResult> {
  const parsed = googleSchema.safeParse(input);
  const clientId = publicEnv.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!parsed.success || !clientId) return { status: "error", error: "googleFailed" };
  const { credential, nonce, terms } = parsed.data;
  const next = parsed.data.next ? safeNextPath(parsed.data.next) : undefined;

  const identity = await verifyGoogleIdToken(credential, clientId).catch(() => null);
  if (!identity) return { status: "error", error: "googleFailed" };
  const { email } = identity;

  let access;
  try {
    access = await ensureBetaAccount(email, next, terms, await apiLocale());
  } catch {
    return { status: "error", error: "googleFailed" };
  }
  if (access === "waitlist") return { status: "waitlist", email };
  if (access === "termsRequired") return { status: "error", error: "termsRequired" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce });
  if (error) return { status: "error", error: "googleFailed" };

  // Prénom donné par Google, seulement s'il manque : c'est lui que voient les proches sur leur lien.
  if (identity.firstName && data.user) {
    await supabase
      .from("users")
      .update({ display_name: identity.firstName })
      .eq("id", data.user.id)
      .or("display_name.is.null,display_name.eq.");
  }

  if (terms) {
    (await cookies()).set(TERMS_COOKIE, LEGAL_VERSION, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return { status: "signedIn", next: next ?? "/chat" };
}
