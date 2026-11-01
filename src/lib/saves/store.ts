import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { SaveCandidate } from "./candidate";

type Client = SupabaseClient<Database>;

export class SaveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SaveError";
  }
}

/** Échappe un nom pour une comparaison ilike exacte (insensible à la casse). */
function exact(name: string): string {
  return name.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** Le lieu existant (même identifiant Google, ou même nom dans la même ville), sinon un nouveau lieu. */
async function resolvePlace(supabase: Client, userId: string, c: SaveCandidate): Promise<string> {
  if (c.googlePlaceId) {
    const byId = await supabase.from("places").select("id").eq("google_place_id", c.googlePlaceId).maybeSingle();
    if (byId.error) throw new SaveError(byId.error.message);
    if (byId.data) return byId.data.id;
  }
  const byName = await supabase.from("places").select("id, city, google_place_id").ilike("name", exact(c.name)).limit(20);
  if (byName.error) throw new SaveError(byName.error.message);
  const sameCity = (city: string | null) => !c.city || !city || city.toLocaleLowerCase("fr") === c.city.toLocaleLowerCase("fr");
  // Un homonyme relié à un autre lieu Google n'est pas le même lieu.
  const found = byName.data.find((p) => sameCity(p.city) && (!c.googlePlaceId || !p.google_place_id));
  if (found) return found.id;

  const created = await supabase
    .from("places")
    .insert({
      name: c.name,
      city: c.city,
      area: c.area,
      kind: c.kind,
      address: c.address,
      google_place_id: c.googlePlaceId,
      lat: c.lat !== null && c.lng !== null ? c.lat : null,
      lng: c.lat !== null && c.lng !== null ? c.lng : null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (created.error) throw new SaveError(created.error.message);
  return created.data.id;
}

/**
 * Garde le lieu dans la mémoire de l'utilisateur, au niveau « Sauvegardé » (source : lien partagé).
 * Jamais attribué à un proche. Un lieu déjà gardé ne crée pas de second signal.
 */
export async function saveCandidate(
  supabase: Client,
  userId: string,
  c: SaveCandidate,
): Promise<{ already: boolean; count: number }> {
  const placeId = await resolvePlace(supabase, userId, c);
  const existing = await supabase
    .from("signals")
    .select("id")
    .eq("user_id", userId)
    .eq("place_id", placeId)
    .is("source_member_id", null)
    .limit(1);
  if (existing.error) throw new SaveError(existing.error.message);
  const already = existing.data.length > 0;
  if (!already) {
    const inserted = await supabase.from("signals").insert({
      user_id: userId,
      place_id: placeId,
      evidence_level: "saved",
      occasion: [],
      note: c.note,
      source_type: "link_share",
    });
    if (inserted.error) throw new SaveError(inserted.error.message);
  }
  const places = await supabase.from("signals").select("place_id").eq("user_id", userId);
  if (places.error) throw new SaveError(places.error.message);
  return { already, count: new Set(places.data.map((s) => s.place_id)).size };
}
