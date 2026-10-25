import "server-only";
import { StoredCriteriaSchema } from "@/lib/conversations/schema";
import { looselyEqual } from "@/lib/search/match";
import { createAdminClient } from "@/lib/supabase/admin";
import { replySignals, type GuestReply } from "./reply";

/**
 * Accès de la page invité (sans compte). Toutes les lectures et écritures passent par le jeton du
 * lien privé, avec le client service_role : le proche ne voit que la question qu'on lui a posée,
 * jamais le cercle, la mémoire ni les autres destinataires.
 */

const TOKEN = /^[0-9a-f]{32}$/;

export type Invitation = {
  /** Prénom du proche, tel que le demandeur l'a enregistré. */
  memberName: string;
  /** Prénom du demandeur, s'il l'a renseigné. */
  requesterName: string | null;
  message: string;
  repliesCount: number;
};

type Admin = ReturnType<typeof createAdminClient>;

async function recipientByToken(admin: Admin, token: string) {
  const { data, error } = await admin
    .from("request_recipients")
    .select(
      "id, circle_member_id, member:circle_members ( name, member_id ), request:requests ( id, user_id, message, conversation:conversations ( criteria ), requester:users ( display_name ) )",
    )
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function loadInvitation(token: string): Promise<Invitation | null> {
  if (!TOKEN.test(token)) return null;
  const admin = createAdminClient();
  const r = await recipientByToken(admin, token);
  if (!r?.request || !r.member) return null;
  const { count } = await admin
    .from("request_replies")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", r.id);
  return {
    memberName: r.member.name,
    requesterName: r.request.requester?.display_name?.trim() || null,
    message: r.request.message,
    repliesCount: count ?? 0,
  };
}

/** Échappe % et _ pour une comparaison ilike exacte. */
function exact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Retrouve le lieu par son nom (dans la ville cherchée si elle est connue), sinon le crée.
 * Un lieu est un fait partagé ; ce qui est personnel vit dans signals.
 */
async function resolvePlace(admin: Admin, name: string, city: string | null): Promise<string> {
  const { data, error } = await admin.from("places").select("id, city").ilike("name", exact(name)).limit(20);
  if (error) throw new Error(error.message);
  const same = data.find((p) => !city || !p.city || looselyEqual(city, p.city));
  if (same) return same.id;

  const created = await admin.from("places").insert({ name, city }).select("id").single();
  if (created.error) throw new Error(created.error.message);
  return created.data.id;
}

export type SubmitResult = { ok: true; memberName: string; requesterName: string | null } | { ok: false; reason: "not_found" };

/**
 * Enregistre la réponse du proche : request_replies, puis les signaux attribués au proche dans la
 * mémoire du demandeur (§ 6.5), et marque le destinataire comme ayant répondu.
 */
export async function submitGuestReply(reply: GuestReply): Promise<SubmitResult> {
  const admin = createAdminClient();
  const r = await recipientByToken(admin, reply.token);
  if (!r?.request || !r.member) return { ok: false, reason: "not_found" };

  const criteria = StoredCriteriaSchema.safeParse(r.request.conversation?.criteria);
  const city = criteria.success ? criteria.data.city : null;
  const occasion = criteria.success ? criteria.data.occasion : null;

  const placeId = await resolvePlace(admin, reply.placeName, city);

  const inserted = await admin
    .from("request_replies")
    .insert({
      request_id: r.request.id,
      recipient_id: r.id,
      place_id: placeId,
      place_text: reply.placeName,
      place_url: reply.placeUrl,
      visited: reply.visited === "oui",
      note: reply.note,
      visible_only_to_requester: reply.visibleOnlyToRequester,
      reusable: reply.reusable,
    })
    .select("id")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);

  const signals = await admin.from("signals").insert(
    replySignals({
      userId: r.request.user_id,
      placeId,
      memberId: r.circle_member_id,
      memberUserId: r.member.member_id,
      replyId: inserted.data.id,
      occasion,
      note: reply.note,
      reusable: reply.reusable,
      visited: reply.visited,
    }),
  );
  if (signals.error) {
    // Pas de réponse sans ses preuves : on retire la réponse orpheline.
    await admin.from("request_replies").delete().eq("id", inserted.data.id);
    throw new Error(signals.error.message);
  }

  const now = new Date().toISOString();
  await admin.from("request_recipients").update({ replied_at: now }).eq("id", r.id);

  return { ok: true, memberName: r.member.name, requesterName: r.request.requester?.display_name?.trim() || null };
}
