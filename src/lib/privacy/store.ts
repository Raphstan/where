import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { DEFAULT_USAGE, USAGE_COLUMNS, type UsagePrefs } from "./usage";

type Client = SupabaseClient<Database>;

export class PrivacyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivacyError";
  }
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new PrivacyError(res.error.message);
  return res.data;
}

export async function loadUsagePrefs(supabase: Client, userId: string): Promise<UsagePrefs> {
  const data = check(
    await supabase
      .from("users")
      .select("use_imported_bookings, use_visit_feedback, use_circle_replies")
      .eq("id", userId)
      .maybeSingle(),
  );
  if (!data) return DEFAULT_USAGE;
  return {
    importedBookings: data.use_imported_bookings,
    visitFeedback: data.use_visit_feedback,
    circleReplies: data.use_circle_replies,
  };
}

export async function saveUsagePrefs(supabase: Client, userId: string, prefs: Partial<UsagePrefs>): Promise<UsagePrefs> {
  const patch: Partial<Record<(typeof USAGE_COLUMNS)[keyof UsagePrefs], boolean>> = {};
  for (const [k, v] of Object.entries(prefs) as [keyof UsagePrefs, boolean | undefined][]) {
    if (v !== undefined) patch[USAGE_COLUMNS[k]] = v;
  }
  check(await supabase.from("users").update(patch).eq("id", userId).select("id").single());
  return loadUsagePrefs(supabase, userId);
}

export type PrivacyOverview = {
  /** La source « transfert d'email » est-elle active (une adresse existe) ? */
  emailSource: boolean;
  /** Confirmations de réservation reçues par transfert. */
  confirmations: number;
  importedPlaces: number;
  circleSize: number;
  usage: UsagePrefs;
};

export async function privacyOverview(supabase: Client, userId: string): Promise<PrivacyOverview> {
  const [address, confirmations, imported, circle, usage] = await Promise.all([
    supabase.from("forward_addresses").select("user_id").maybeSingle(),
    supabase.from("forwarded_emails").select("id", { count: "exact", head: true }).in("kind", ["table", "hotel", "activity"]),
    supabase.rpc("imported_places_count"),
    supabase.from("circle_members").select("id", { count: "exact", head: true }).eq("user_id", userId),
    loadUsagePrefs(supabase, userId),
  ]);
  check(confirmations);
  check(circle);
  return {
    emailSource: check(address) !== null,
    confirmations: confirmations.count ?? 0,
    importedPlaces: check(imported) ?? 0,
    circleSize: circle.count ?? 0,
    usage,
  };
}

/**
 * « Supprimer une source » : l'adresse de transfert disparaît (le webhook ignore désormais tout
 * email qui lui est adressé) avec les emails déjà reçus, leur texte compris. Les lieux déjà
 * importés restent dans la mémoire, « sauf si tu les supprimes ».
 */
export async function deleteEmailSource(supabase: Client, userId: string): Promise<void> {
  check(await supabase.from("forward_addresses").delete().eq("user_id", userId));
  check(await supabase.from("forwarded_emails").delete().eq("user_id", userId));
}

/** Rétablit la source avec une nouvelle adresse : le jeton est tiré par la base. */
export async function restoreEmailSource(supabase: Client, userId: string): Promise<void> {
  const res = await supabase.from("forward_addresses").insert({ user_id: userId });
  // Déjà active (autre onglet) : rien à faire.
  if (res.error && res.error.code !== "23505") throw new PrivacyError(res.error.message);
}

/** « Supprimer tous les lieux importés » : retourne le nombre de lieux retirés. */
export async function deleteImportedPlaces(supabase: Client): Promise<number> {
  return check(await supabase.rpc("delete_imported_places")) ?? 0;
}

/** « Supprimer mon compte » : définitif, toutes les données partent en cascade. */
export async function deleteAccount(supabase: Client): Promise<void> {
  check(await supabase.rpc("delete_my_account"));
}
