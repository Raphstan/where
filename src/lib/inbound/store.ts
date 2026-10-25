import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  initialStatus,
  isReservation,
  qualificationLevels,
  type EmailKind,
  type ImportedEmail,
  type Qualification,
  type ReservationKind,
} from "./rules";
import type { Classification } from "./schema";

type Client = SupabaseClient<Database>;

export class InboundError extends Error {
  constructor(
    readonly code: "not_found" | "already_answered" | "storage_unavailable",
    message: string,
  ) {
    super(message);
    this.name = "InboundError";
  }
}

const UNIQUE_VIOLATION = "23505";
export const MAX_BODY_CHARS = 40_000;

/** Échappe % et _ pour un ilike exact (insensible à la casse). */
function exact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/* ---------------------------------------------------------------------------
 * Webhook (service_role) : de l'adresse au compte, puis enregistrement
 * ------------------------------------------------------------------------- */

/** Propriétaire d'une adresse de transfert et email de son compte (pour vérifier l'expéditeur). */
export async function findForwardOwner(admin: Client, token: string): Promise<{ userId: string; email: string } | null> {
  const { data, error } = await admin
    .from("forward_addresses")
    .select("user_id, user:users!inner ( email )")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new InboundError("storage_unavailable", error.message);
  return data ? { userId: data.user_id, email: data.user.email } : null;
}

export async function alreadyReceived(admin: Client, resendEmailId: string): Promise<boolean> {
  const { data, error } = await admin.from("forwarded_emails").select("id").eq("resend_email_id", resendEmailId).maybeSingle();
  if (error) throw new InboundError("storage_unavailable", error.message);
  return Boolean(data);
}

export type IngestInput = {
  userId: string;
  resendEmailId: string;
  fromAddress: string;
  subject: string | null;
  text: string;
  receivedAt: string;
  classification: Classification;
};

export type IngestResult =
  | { outcome: "stored"; kind: EmailKind; status: string; cancelled: number }
  | { outcome: "duplicate" };

/**
 * Enregistre un email classé. Rien n'entre dans la mémoire ici : une réservation attend la
 * qualification, une livraison ou une annulation est écartée (et comptée). Une annulation retire
 * de la pile la réservation correspondante encore en attente.
 */
export async function ingestEmail(admin: Client, input: IngestInput): Promise<IngestResult> {
  const c = input.classification;

  // Un rappel de la même réservation ne crée pas une deuxième carte à qualifier.
  if (isReservation(c.kind) && c.placeName) {
    let same = admin
      .from("forwarded_emails")
      .select("id")
      .eq("user_id", input.userId)
      .eq("kind", c.kind)
      .ilike("place_name", exact(c.placeName))
      .neq("status", "cancelled")
      .limit(1);
    same = c.reservedFor ? same.eq("reserved_for", c.reservedFor) : same.is("reserved_for", null);
    const { data, error } = await same;
    if (error) throw new InboundError("storage_unavailable", error.message);
    if (data.length > 0) return { outcome: "duplicate" };
  }

  const status = initialStatus(c.kind);
  const { error } = await admin.from("forwarded_emails").insert({
    user_id: input.userId,
    resend_email_id: input.resendEmailId,
    from_address: input.fromAddress,
    subject: input.subject,
    body_text: input.text.slice(0, MAX_BODY_CHARS),
    received_at: input.receivedAt,
    kind: c.kind,
    platform: c.platform,
    place_name: c.placeName,
    city: c.city,
    reserved_for: c.reservedFor,
    status,
  });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { outcome: "duplicate" };
    throw new InboundError("storage_unavailable", error.message);
  }

  let cancelled = 0;
  if (c.kind === "cancellation" && c.placeName) {
    let pending = admin
      .from("forwarded_emails")
      .update({ status: "cancelled" })
      .eq("user_id", input.userId)
      .eq("status", "pending")
      .ilike("place_name", exact(c.placeName));
    if (c.reservedFor) pending = pending.or(`reserved_for.eq.${c.reservedFor},reserved_for.is.null`);
    const { data, error: cancelError } = await pending.select("id");
    if (cancelError) throw new InboundError("storage_unavailable", cancelError.message);
    cancelled = data.length;
  }
  return { outcome: "stored", kind: c.kind, status, cancelled };
}

/* ---------------------------------------------------------------------------
 * Écrans de l'utilisateur (RLS)
 * ------------------------------------------------------------------------- */

export async function forwardTokenOf(supabase: Client): Promise<string | null> {
  const { data, error } = await supabase.from("forward_addresses").select("token").maybeSingle();
  if (error) throw new InboundError("storage_unavailable", error.message);
  return data?.token ?? null;
}

export async function listImported(supabase: Client): Promise<ImportedEmail[]> {
  const { data, error } = await supabase
    .from("forwarded_emails")
    .select("id, kind, status, platform, place_name, city, reserved_for")
    .order("reserved_for", { ascending: false, nullsFirst: false })
    .order("received_at", { ascending: false })
    .limit(500);
  if (error) throw new InboundError("storage_unavailable", error.message);
  return data.map((e) => ({
    id: e.id,
    kind: e.kind,
    status: e.status,
    platform: e.platform,
    placeName: e.place_name,
    city: e.city,
    reservedFor: e.reserved_for,
  }));
}

export type PendingReservation = {
  id: string;
  kind: ReservationKind;
  placeName: string;
  city: string | null;
  platform: string | null;
  reservedFor: string | null;
};

/** Réservations à qualifier, de la plus récente à la plus ancienne (maquette QPLACES). */
export async function pendingReservations(supabase: Client): Promise<PendingReservation[]> {
  const { data, error } = await supabase
    .from("forwarded_emails")
    .select("id, kind, place_name, city, platform, reserved_for")
    .eq("status", "pending")
    .in("kind", ["table", "hotel", "activity"])
    .order("reserved_for", { ascending: false, nullsFirst: false })
    .order("received_at", { ascending: false });
  if (error) throw new InboundError("storage_unavailable", error.message);
  return data.flatMap((e) =>
    isReservation(e.kind) && e.place_name
      ? [{ id: e.id, kind: e.kind, placeName: e.place_name, city: e.city, platform: e.platform, reservedFor: e.reserved_for }]
      : [],
  );
}

/** Le lieu de la mémoire qui porte ce nom (et cette ville), sinon un nouveau lieu. */
async function resolvePlace(supabase: Client, userId: string, name: string, city: string | null): Promise<string> {
  const { data, error } = await supabase.from("places").select("id, city").ilike("name", exact(name)).limit(20);
  if (error) throw new InboundError("storage_unavailable", error.message);
  const sameCity = (c: string | null) => !city || !c || c.toLocaleLowerCase("fr") === city.toLocaleLowerCase("fr");
  const found = data.find((p) => city && p.city?.toLocaleLowerCase("fr") === city.toLocaleLowerCase("fr")) ?? data.find((p) => sameCity(p.city));
  if (found) return found.id;

  const created = await supabase.from("places").insert({ name, city, created_by: userId }).select("id").single();
  if (created.error) throw new InboundError("storage_unavailable", created.error.message);
  return created.data.id;
}

/**
 * « Qualifier mes expériences » : la validation de l'utilisateur crée les signaux (booked, puis
 * visited ou recommended). « Non » et « Ignorer ce lieu » n'en créent aucun. Chaque réservation ne
 * se qualifie qu'une fois (trigger en base).
 */
export async function qualifyEmail(
  supabase: Client,
  userId: string,
  id: string,
  input: Qualification,
  now = new Date(),
): Promise<{ levels: string[] }> {
  const found = await supabase
    .from("forwarded_emails")
    .select("id, kind, status, place_name, city")
    .eq("id", id)
    .maybeSingle();
  if (found.error) throw new InboundError("storage_unavailable", found.error.message);
  if (!found.data || !isReservation(found.data.kind) || !found.data.place_name) {
    throw new InboundError("not_found", "Réservation introuvable.");
  }
  if (found.data.status !== "pending") throw new InboundError("already_answered", "Ce lieu est déjà qualifié.");

  if (input.action === "skip") {
    const { data, error } = await supabase.from("forwarded_emails").update({ status: "skipped" }).eq("id", id).eq("status", "pending").select("id");
    if (error) throw new InboundError("storage_unavailable", error.message);
    if (data.length === 0) throw new InboundError("already_answered", "Ce lieu est déjà qualifié.");
    return { levels: [] };
  }

  const levels = qualificationLevels(found.data.kind, input);
  let placeId: string | null = null;
  const signalIds: string[] = [];
  if (levels.length > 0) {
    placeId = await resolvePlace(supabase, userId, found.data.place_name, found.data.city);
    const visit = levels.find((l) => l !== "booked");
    const { data, error } = await supabase
      .from("signals")
      .insert([
        // La réservation elle-même, prouvée par l'email. Colonnes explicites : dans une insertion
        // multiple, PostgREST met à null les colonnes absentes d'une ligne, au lieu de leur défaut.
        { user_id: userId, place_id: placeId, evidence_level: "booked", occasion: [], note: null, source_type: "email_forward" },
        // La visite, déclarée par l'utilisateur.
        ...(visit
          ? [{
              user_id: userId,
              place_id: placeId,
              evidence_level: visit,
              occasion: input.occasion,
              note: input.note || null,
              source_type: "qualification" as const,
            }]
          : []),
      ])
      .select("id");
    if (error) throw new InboundError("storage_unavailable", error.message);
    signalIds.push(...data.map((s) => s.id));
  }

  const updated = await supabase
    .from("forwarded_emails")
    .update({
      status: "qualified",
      place_id: placeId,
      qualified_at: now.toISOString(),
      visited: input.visited,
      recommend: input.recommend,
      occasion: input.occasion,
      note: input.note || null,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (updated.error || updated.data.length === 0) {
    // Qualifié entre-temps (autre onglet) : on retire les signaux en double.
    if (signalIds.length) await supabase.from("signals").delete().in("id", signalIds);
    if (updated.error) throw new InboundError("storage_unavailable", updated.error.message);
    throw new InboundError("already_answered", "Ce lieu est déjà qualifié.");
  }
  return { levels };
}
