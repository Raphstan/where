import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";
import type { Database } from "./database.types";

/**
 * Client service_role : contourne RLS. Réservé à la page invité /r/[token] (src/app/r), où le proche
 * répond sans compte (CLAUDE.md § 3). Chaque requête y est restreinte au jeton du lien privé.
 * Ne jamais l'importer ailleurs, ni dans un composant client.
 */
export function createAdminClient() {
  const key = getServerEnv().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY manquante : la page invité ne peut pas fonctionner.");
  return createSupabaseClient<Database>(publicEnv.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
