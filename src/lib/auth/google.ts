import { z } from "zod";

/**
 * Jeton d'identité Google (« Continuer avec Google », Google Identity Services).
 *
 * L'email doit être vérifié AVANT ensureBetaAccount, qui peut créer un compte : on ne se fie donc
 * pas au contenu du jeton, on le fait valider par Google (endpoint tokeninfo, qui contrôle la
 * signature et l'expiration). Supabase le revérifie ensuite dans signInWithIdToken.
 */
const claimsSchema = z.object({
  iss: z.enum(["accounts.google.com", "https://accounts.google.com"]),
  aud: z.string(),
  email: z.string().trim().toLowerCase().email(),
  email_verified: z.union([z.literal("true"), z.literal(true)]),
});

/** Email vérifié du jeton, ou null s'il ne vient pas de Google, vise une autre appli ou n'est pas vérifié. */
export function verifiedEmailFromClaims(claims: unknown, clientId: string): string | null {
  const parsed = claimsSchema.safeParse(claims);
  if (!parsed.success || parsed.data.aud !== clientId) return null;
  return parsed.data.email;
}

export async function verifyGoogleIdToken(credential: string, clientId: string): Promise<string | null> {
  const url = new URL("https://oauth2.googleapis.com/tokeninfo");
  url.searchParams.set("id_token", credential);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  return verifiedEmailFromClaims(await response.json(), clientId);
}
