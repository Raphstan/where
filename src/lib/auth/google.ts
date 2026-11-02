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
  given_name: z.string().optional(),
  name: z.string().optional(),
});

export type GoogleIdentity = { email: string; firstName: string | null };

/** Prénom affichable : given_name, sinon le premier mot de name ; null si Google n'en donne pas. */
function firstNameFrom(givenName: string | undefined, name: string | undefined): string | null {
  const first = givenName?.trim() || name?.trim().split(/\s+/)[0] || "";
  return first ? first.slice(0, 60) : null;
}

/**
 * Identité vérifiée du jeton (email en minuscules, prénom s'il est fourni), ou null s'il ne vient pas
 * de Google, vise une autre appli ou n'a pas d'email vérifié.
 */
export function verifiedIdentityFromClaims(claims: unknown, clientId: string): GoogleIdentity | null {
  const parsed = claimsSchema.safeParse(claims);
  if (!parsed.success || parsed.data.aud !== clientId) return null;
  return { email: parsed.data.email, firstName: firstNameFrom(parsed.data.given_name, parsed.data.name) };
}

export async function verifyGoogleIdToken(credential: string, clientId: string): Promise<GoogleIdentity | null> {
  const url = new URL("https://oauth2.googleapis.com/tokeninfo");
  url.searchParams.set("id_token", credential);
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return null;
  return verifiedIdentityFromClaims(await response.json(), clientId);
}
