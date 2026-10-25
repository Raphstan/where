import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { learnedPreferences } from "./preferences";

type Client = SupabaseClient<Database>;

export type Profile = { email: string; name: string | null; city: string | null; preferences: string[] };

/** Profil et préférences apprises, sous RLS. */
export async function loadProfile(supabase: Client, userId: string): Promise<Profile | null> {
  const [user, own] = await Promise.all([
    supabase.from("users").select("email, display_name, city").eq("id", userId).maybeSingle(),
    supabase
      .from("signals")
      .select("place_id, occasion, place:places!inner ( vibe )")
      .eq("user_id", userId)
      .is("source_member_id", null)
      .in("evidence_level", ["visited", "recommended"])
      .limit(500),
  ]);
  if (user.error) throw new Error(user.error.message);
  if (own.error) throw new Error(own.error.message);
  if (!user.data) return null;
  return {
    email: user.data.email,
    name: user.data.display_name?.trim() || null,
    city: user.data.city?.trim() || null,
    preferences: learnedPreferences(own.data.map((s) => ({ placeId: s.place_id, vibe: s.place.vibe, occasion: s.occasion }))),
  };
}

export async function saveProfile(supabase: Client, userId: string, p: { name: string | null; city: string | null }) {
  const { error } = await supabase.from("users").update({ display_name: p.name, city: p.city }).eq("id", userId);
  if (error) throw new Error(error.message);
}

export type HistoryItem = { id: string; question: string };

/** Historique de la barre latérale : les dernières questions, de la plus récente à la plus ancienne. */
export async function recentConversations(supabase: Client, userId: string, limit = 8): Promise<HistoryItem[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id, question")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data;
}
