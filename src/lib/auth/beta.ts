/**
 * Bêta privée : qui peut recevoir un lien de connexion (décision du 2026-11-01).
 * - un compte existant : toujours ;
 * - un email de la table beta_access : on lui crée son compte ;
 * - un proche arrivé par son lien privé (/join/{token}, jeton valide) : le lien vaut invitation.
 * Sinon : liste d'attente, aucun email envoyé.
 */
export type BetaDecision = "existing" | "invited" | "guest" | "waitlist";

const JOIN_PATH = /^\/join\/([0-9a-f]{32})$/;

/** Jeton d'invitation porté par la destination après connexion (« Garder ma mémoire WH3RE »). */
export function guestTokenFromNext(next: string | null | undefined): string | null {
  return next?.match(JOIN_PATH)?.[1] ?? null;
}

export function decideBetaAccess(input: { existing: boolean; invited: boolean; validGuestToken: boolean }): BetaDecision {
  if (input.existing) return "existing";
  if (input.invited) return "invited";
  if (input.validGuestToken) return "guest";
  return "waitlist";
}

/**
 * Pas de compte sans acceptation des conditions (CGU + politique de confidentialité).
 * Un compte existant entre sans la case : il l'a acceptée à sa création, ou avant qu'elle existe.
 */
export function termsGate(decision: BetaDecision, acceptedTerms: boolean): BetaDecision | "termsRequired" {
  if ((decision === "invited" || decision === "guest") && !acceptedTerms) return "termsRequired";
  return decision;
}
