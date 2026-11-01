import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decideBetaAccess, guestTokenFromNext, type BetaDecision } from "./beta";

/**
 * Décide l'accès et, pour une nouvelle personne autorisée, crée son compte (les inscriptions libres
 * sont fermées côté Supabase). Usage service_role restreint : lecture de users / beta_access /
 * request_recipients par email ou jeton, et création du compte (CLAUDE.md § 3).
 */
export async function ensureBetaAccount(email: string, next: string | null | undefined): Promise<BetaDecision> {
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

  const decision = decideBetaAccess({ existing: !!user.data, invited: !!invite.data, validGuestToken: !!guest.data });
  if (decision === "invited" || decision === "guest") {
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    // Course possible (deux envois rapprochés) : le compte existe déjà, c'est le résultat voulu.
    if (created.error && !/already|exists|registered/i.test(created.error.message)) throw new Error(created.error.message);
  }
  return decision;
}
