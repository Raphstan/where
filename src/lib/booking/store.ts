import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { bookedAnswerLevel, feedbackLevel, followUpDueAt, type CreateBooking, type DueFollowup, type Feedback } from "./followup";

type Client = SupabaseClient<Database>;

export class BookingError extends Error {
  constructor(
    readonly code: "not_found" | "already_answered" | "no_signal" | "storage_unavailable",
    message: string,
  ) {
    super(message);
    this.name = "BookingError";
  }
}

const UNIQUE_VIOLATION = "23505";

/** Lieu de la mémoire, ou découverte Google Places retrouvée ou créée par son place_id. */
async function resolvePlace(supabase: Client, userId: string, place: CreateBooking["place"]): Promise<string> {
  if ("id" in place) {
    const { data, error } = await supabase.from("places").select("id").eq("id", place.id).maybeSingle();
    if (error) throw new BookingError("storage_unavailable", error.message);
    if (!data) throw new BookingError("not_found", "Lieu introuvable.");
    return data.id;
  }
  const find = () => supabase.from("places").select("id").eq("google_place_id", place.googlePlaceId).maybeSingle();
  const existing = await find();
  if (existing.error) throw new BookingError("storage_unavailable", existing.error.message);
  if (existing.data) return existing.data.id;

  const created = await supabase
    .from("places")
    .insert({ name: place.name, address: place.address, google_place_id: place.googlePlaceId, created_by: userId })
    .select("id")
    .single();
  if (!created.error) return created.data.id;
  if (created.error.code !== UNIQUE_VIOLATION) throw new BookingError("storage_unavailable", created.error.message);
  const raced = await find(); // Créé entre-temps par quelqu'un d'autre.
  if (raced.error || !raced.data) throw new BookingError("storage_unavailable", raced.error?.message ?? "Lieu introuvable.");
  return raced.data.id;
}

/**
 * « As-tu réservé ? » → Oui : un signal `booked` de l'utilisateur et un suivi pour le lendemain.
 * Un seul suivi ouvert par lieu (index unique) : répondre deux fois ne double pas la réservation.
 */
export async function recordBooking(
  supabase: Client,
  userId: string,
  input: CreateBooking,
  now = new Date(),
): Promise<{ followupId: string; created: boolean }> {
  const placeId = await resolvePlace(supabase, userId, input.place);

  const followup = await supabase
    .from("visit_followups")
    .insert({
      user_id: userId,
      place_id: placeId,
      conversation_id: input.conversationId,
      booked_at: now.toISOString(),
      due_at: followUpDueAt(now).toISOString(),
    })
    .select("id")
    .single();
  if (followup.error) {
    if (followup.error.code !== UNIQUE_VIOLATION) throw new BookingError("storage_unavailable", followup.error.message);
    const open = await supabase
      .from("visit_followups")
      .select("id")
      .eq("place_id", placeId)
      .is("answered_at", null)
      .maybeSingle();
    if (open.error || !open.data) throw new BookingError("storage_unavailable", open.error?.message ?? "Suivi introuvable.");
    return { followupId: open.data.id, created: false };
  }

  const signal = await supabase.from("signals").insert({
    user_id: userId,
    place_id: placeId,
    evidence_level: bookedAnswerLevel("Oui")!,
    source_type: "manual",
  });
  if (signal.error) {
    await supabase.from("visit_followups").delete().eq("id", followup.data.id);
    throw new BookingError("storage_unavailable", signal.error.message);
  }
  return { followupId: followup.data.id, created: true };
}

/** Retours rendus dus par le cron et pas encore répondus, du plus ancien au plus récent. */
export async function dueFollowups(supabase: Client, conversationId: string | null): Promise<DueFollowup[]> {
  let query = supabase
    .from("visit_followups")
    .select("id, booked_at, conversation_id, place:places!inner ( name )")
    .not("prompted_at", "is", null)
    .is("answered_at", null)
    .order("booked_at", { ascending: true });
  if (conversationId) query = query.eq("conversation_id", conversationId);
  const { data, error } = await query;
  if (error) throw new BookingError("storage_unavailable", error.message);
  return data.map((f) => ({ id: f.id, placeName: f.place.name, conversationId: f.conversation_id, bookedAt: f.booked_at }));
}

/**
 * Enregistre le retour. Visité → un signal `visited` ou `recommended` de l'utilisateur, provenance
 * `post_visit_feedback`. « Je n’y suis finalement pas allé » → aucun signal : la réservation reste
 * une réservation, jamais une visite.
 */
export async function answerFollowup(
  supabase: Client,
  userId: string,
  id: string,
  feedback: Feedback,
  now = new Date(),
): Promise<{ level: ReturnType<typeof feedbackLevel> }> {
  const found = await supabase.from("visit_followups").select("id, place_id, answered_at").eq("id", id).maybeSingle();
  if (found.error) throw new BookingError("storage_unavailable", found.error.message);
  if (!found.data) throw new BookingError("not_found", "Retour introuvable.");
  if (found.data.answered_at) throw new BookingError("already_answered", "Ce retour est déjà enregistré.");

  const level = feedbackLevel(feedback);
  let signalId: string | null = null;
  if (level) {
    const signal = await supabase
      .from("signals")
      .insert({
        user_id: userId,
        place_id: found.data.place_id,
        evidence_level: level,
        occasion: feedback.occasion,
        source_type: "post_visit_feedback",
      })
      .select("id")
      .single();
    if (signal.error) throw new BookingError("storage_unavailable", signal.error.message);
    signalId = signal.data.id;
  }

  const updated = await supabase
    .from("visit_followups")
    .update({
      answered_at: now.toISOString(),
      rating: feedback.rating,
      recommend: feedback.recommend,
      occasion: feedback.occasion,
      signal_id: signalId,
    })
    .eq("id", id)
    .is("answered_at", null)
    .select("id");
  if (updated.error || updated.data.length === 0) {
    // Répondu entre-temps (autre onglet) : on retire le signal en double.
    if (signalId) await supabase.from("signals").delete().eq("id", signalId);
    if (updated.error) throw new BookingError("storage_unavailable", updated.error.message);
    throw new BookingError("already_answered", "Ce retour est déjà enregistré.");
  }
  return { level };
}

/** « Partager ce retour avec mon cercle privé » : jamais public, réversible. */
export async function shareFollowup(supabase: Client, id: string, shared: boolean): Promise<void> {
  const found = await supabase.from("visit_followups").select("signal_id").eq("id", id).maybeSingle();
  if (found.error) throw new BookingError("storage_unavailable", found.error.message);
  if (!found.data) throw new BookingError("not_found", "Retour introuvable.");
  if (!found.data.signal_id) throw new BookingError("no_signal", "Sans visite, il n’y a rien à partager.");
  const { error } = await supabase.from("signals").update({ shared_with_circle: shared }).eq("id", found.data.signal_id);
  if (error) throw new BookingError("storage_unavailable", error.message);
}
