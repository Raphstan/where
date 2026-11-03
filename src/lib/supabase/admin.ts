import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";
import type { Database } from "./database.types";

/**
 * Client service_role : contourne RLS. Usages, tous côté serveur :
 * - la page invité /r/[token] et « Garder ma mémoire WH3RE » (/join/[token], src/lib/network/guest.ts),
 *   où le proche répond sans compte puis relie le sien (CLAUDE.md § 3) ; chaque requête y est
 *   restreinte au jeton du lien privé ;
 * - la connexion pendant la bêta privée (src/lib/auth/beta-access.ts) : vérifie l'invitation d'un
 *   email et crée son compte, les inscriptions libres étant fermées ;
 * - la connexion par email (src/lib/auth/login-request.ts) : generateLink et la table login_requests,
 *   lue et écrite seulement avec les secrets de la demande ;
 * - la tâche planifiée /api/cron/visit-followups, protégée par CRON_SECRET, qui ne fait que marquer
 *   les retours après visite arrivés à échéance ;
 * - le webhook Resend /api/inbound/resend, signé (RESEND_WEBHOOK_SECRET), qui retrouve le compte par
 *   son adresse de transfert et n'écrit que dans forwarded_emails (jamais de signal).
 * Ne jamais l'importer ailleurs, ni dans un composant client.
 */
export function createAdminClient() {
  const key = getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante : la page invité, le cron et la réception des emails ne peuvent pas fonctionner.");
  return createSupabaseClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
