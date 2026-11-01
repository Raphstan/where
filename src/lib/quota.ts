import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Plafonds quotidiens (UTC). Larges pour un usage normal ; ils bloquent un abus ou un bug qui boucle
 * avant qu'il ne coûte (Claude, Google Places) ou ne pollue une mémoire. Compteur : usage_counters.
 */
export const QUOTAS = {
  /** Questions comprises par Claude, par utilisateur. */
  ask: 50,
  /** Recherches (dont la découverte Google Places), par utilisateur. */
  search: 80,
  /** Liens partagés lus (Claude, Google Places), par utilisateur. */
  save: 40,
  /** Réponses envoyées depuis un même lien privé de proche. */
  guest_reply: 20,
  /** Emails transférés traités pour une même adresse de transfert. */
  inbound_email: 300,
} as const;

export type QuotaAction = keyof typeof QUOTAS;

type Client = SupabaseClient<Database>;

/**
 * Quota de l'utilisateur connecté (client de session). En cas d'erreur de la base, on laisse passer :
 * une panne du compteur ne doit pas bloquer le produit.
 */
export async function consumeMyQuota(supabase: Client, action: "ask" | "search" | "save"): Promise<boolean> {
  const { data, error } = await supabase.rpc("consume_my_quota", { p_action: action, p_limit: QUOTAS[action] });
  if (error) {
    console.error(`[quota] ${action}`, error.message);
    return true;
  }
  return data === true;
}

/** Quota d'un sujet sans compte (lien privé, adresse de transfert), côté serveur (service_role). */
export async function consumeQuota(admin: Client, subject: string, action: "guest_reply" | "inbound_email"): Promise<boolean> {
  const { data, error } = await admin.rpc("consume_quota", { p_subject: subject, p_action: action, p_limit: QUOTAS[action] });
  if (error) {
    console.error(`[quota] ${action}`, error.message);
    return true;
  }
  return data === true;
}
