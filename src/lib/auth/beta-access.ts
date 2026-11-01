import "server-only";
import { LEGAL_VERSION } from "@/content/legal";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideBetaAccess, guestTokenFromNext, termsGate, type BetaDecision } from "./beta";

/**
 * Décide l'accès et, pour une nouvelle personne autorisée, crée son compte (les inscriptions libres
 * sont fermées côté Supabase). Usage service_role restreint : lecture de users / beta_access /
 * request_recipients par email ou jeton, création du compte et trace de l'acceptation des
 * conditions (CLAUDE.md § 3).
 *
 * `acceptedTerms` : la case « J'accepte les conditions » était cochée. Sans elle, aucun compte
 * n'est créé (« termsRequired ») ; un compte existant entre quand même.
 */
export async function ensureBetaAccount(
  email: string,
  next: string | null | undefined,
  acceptedTerms: boolean,
): Promise<BetaDecision | "termsRequired"> {
  const admin = createAdminClient();
  const token = guestTokenFromNext(next);
  const [user, invite, guest] = await Promise.all([
    admin.from("users").select("id").eq("email", email).maybeSingle(),
    admin.from("beta_access").select("email").eq("email", email).maybeSingle(),
    token
      ? admin.from("request_recipients").select("id").eq("token", token).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  for (const r of [user, invite, guest]) if (r.error) throw new Error(r.error.message);

  const decision = termsGate(
    decideBetaAccess({ existing: !!user.data, invited: !!invite.data, validGuestToken: !!guest.data }),
    acceptedTerms,
  );
  if (decision === "waitlist" || decision === "termsRequired") return decision;
  if (decision === "invited" || decision === "guest") {
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    // Course possible (deux envois rapprochés) : le compte existe déjà, c'est le résultat voulu.
    if (created.error && !/already|exists|registered/i.test(created.error.message)) throw new Error(created.error.message);
  }
  if (acceptedTerms) {
    // Le profil (public.users) est créé par le déclencheur handle_new_user, dans la même transaction.
    const recorded = await admin
      .from("users")
      .update({ terms_version: LEGAL_VERSION, terms_accepted_at: new Date().toISOString() })
      .eq("email", email);
    if (recorded.error) throw new Error(recorded.error.message);
  }
  return decision;
}
