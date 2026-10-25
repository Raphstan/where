import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TrustDomain } from "./domains";
import { normalizeDomains, type NewMember } from "./member";

type Client = SupabaseClient<Database>;

export type CircleMemberView = {
  id: string;
  name: string;
  relation: string | null;
  description: string | null;
  trustDomains: TrustDomain[];
};

export async function listCircle(supabase: Client, userId: string): Promise<CircleMemberView[]> {
  const { data, error } = await supabase
    .from("circle_members")
    .select("id, name, relation, description, trust_domains")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data.map((m) => ({
    id: m.id,
    name: m.name,
    relation: m.relation,
    description: m.description,
    trustDomains: m.trust_domains,
  }));
}

/** Ajoute une personne au cercle. Rien ne lui est envoyé. */
export async function addMember(supabase: Client, userId: string, m: NewMember): Promise<string> {
  const { data, error } = await supabase
    .from("circle_members")
    .insert({ user_id: userId, ...m, trust_domains: [] })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** Domaines de confiance d'une personne. false : introuvable dans le cercle de l'utilisateur. */
export async function setDomains(supabase: Client, id: string, domains: readonly TrustDomain[]): Promise<boolean> {
  const { data, error } = await supabase
    .from("circle_members")
    .update({ trust_domains: normalizeDomains(domains) })
    .eq("id", id)
    .select("id");
  if (error) throw new Error(error.message);
  return data.length > 0;
}
