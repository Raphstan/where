import "server-only";
import { StoredCriteriaSchema } from "@/lib/conversations/schema";
import { looselyEqual } from "@/lib/search/match";
import { createAdminClient } from "@/lib/supabase/admin";
import { ownMemorySignals, replySignals, visitClaim, type GuestReply, type VisitClaim } from "./reply";
import { consumeQuota } from "@/lib/quota";

/**
 * Accès de la page invité (sans compte). Toutes les lectures et écritures passent par le jeton du
 * lien privé, avec le client service_role : le proche ne voit que la question qu'on lui a posée,
 * jamais le cercle, la mémoire ni les autres destinataires.
 */

const TOKEN = /^[0-9a-f]{32}$/;

export type Invitation = {
  /** 'invite' : lien d'invitation (« tes adresses préférées »), le proche n'est pas encore connu. */
  kind: "question" | "invite";
  /** Prénom du proche, tel que le demandeur l'a enregistré ; null pour une invitation sans réponse. */
  memberName: string | null;
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
      "id, circle_member_id, member:circle_members ( name, member_id ), request:requests ( id, kind, user_id, message, conversation:conversations ( criteria ), requester:users ( display_name ) )",
    )
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Le jeton désigne-t-il un lien privé existant ? (Lecture minimale, avant un appel payant.) */
export async function tokenExists(token: string): Promise<boolean> {
  if (!TOKEN.test(token)) return false;
  const { data, error } = await createAdminClient().from("request_recipients").select("id").eq("token", token).maybeSingle();
  if (error) throw new Error(error.message);
  return data !== null;
}

export async function loadInvitation(token: string): Promise<Invitation | null> {
  if (!TOKEN.test(token)) return null;
  const admin = createAdminClient();
  const r = await recipientByToken(admin, token);
  if (!r?.request || (!r.member && r.request.kind !== "invite")) return null;
  const { count } = await admin
    .from("request_replies")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", r.id);
  return {
    kind: r.request.kind === "invite" ? "invite" : "question",
    memberName: r.member?.name ?? null,
    requesterName: r.request.requester?.display_name?.trim() || null,
    message: r.request.message,
    repliesCount: count ?? 0,
  };
}

/** Échappe % et _ pour une comparaison ilike exacte. */
function exact(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

type PlaceInput = { name: string; city: string | null; googlePlaceId: string | null; address: string | null };

/**
 * Retrouve le lieu : par son identifiant Google s'il a été choisi parmi les suggestions, sinon par
 * son nom (dans la ville connue, s'il y en a une). Sinon, le crée. Un lieu est un fait partagé ;
 * ce qui est personnel vit dans signals.
 */
async function resolvePlace(admin: Admin, place: PlaceInput): Promise<string> {
  if (place.googlePlaceId) {
    const byId = await admin.from("places").select("id").eq("google_place_id", place.googlePlaceId).limit(1).maybeSingle();
    if (byId.error) throw new Error(byId.error.message);
    if (byId.data) return byId.data.id;
  }

  const { data, error } = await admin.from("places").select("id, city, google_place_id").ilike("name", exact(place.name)).limit(20);
  if (error) throw new Error(error.message);
  // Un homonyme déjà rattaché à un autre lieu Google n'est pas le même endroit.
  const same = data.find(
    (p) =>
      (!place.googlePlaceId || !p.google_place_id) && (!place.city || !p.city || looselyEqual(place.city, p.city)),
  );
  if (same) {
    if (place.googlePlaceId) {
      // Le lieu tapé à la main est enfin identifié : on le complète, sans écraser ce qui est connu.
      await admin
        .from("places")
        .update({ google_place_id: place.googlePlaceId })
        .eq("id", same.id)
        .is("google_place_id", null);
      if (place.city && !same.city) await admin.from("places").update({ city: place.city }).eq("id", same.id).is("city", null);
    }
    return same.id;
  }

  const created = await admin
    .from("places")
    .insert({ name: place.name, city: place.city, google_place_id: place.googlePlaceId, address: place.address })
    .select("id")
    .single();
  if (created.error) throw new Error(created.error.message);
  return created.data.id;
}

export type SubmitResult =
  | { ok: true; memberName: string; requesterName: string | null }
  | { ok: false; reason: "not_found" | "quota_exceeded" | "name_required" };

/**
 * Lien d'invitation : à la première réponse, le proche entre dans le cercle du demandeur sous le
 * prénom qu'il donne, et le lien lui est rattaché. Les réponses suivantes réutilisent ce proche.
 */
async function memberForInvite(
  admin: Admin,
  recipientId: string,
  requesterId: string,
  guestName: string,
): Promise<{ id: string; name: string; memberUserId: string | null }> {
  const created = await admin
    .from("circle_members")
    .insert({ user_id: requesterId, name: guestName })
    .select("id, name")
    .single();
  if (created.error) throw new Error(created.error.message);
  const linked = await admin
    .from("request_recipients")
    .update({ circle_member_id: created.data.id })
    .eq("id", recipientId)
    .is("circle_member_id", null)
    .select("id");
  if (linked.error) throw new Error(linked.error.message);
  if (linked.data.length > 0) return { id: created.data.id, name: created.data.name, memberUserId: null };

  // Deux envois simultanés : l'autre a gagné, on reprend son proche et on retire le doublon.
  await admin.from("circle_members").delete().eq("id", created.data.id);
  const again = await admin
    .from("request_recipients")
    .select("circle_member_id, member:circle_members ( name, member_id )")
    .eq("id", recipientId)
    .single();
  if (again.error || !again.data.circle_member_id || !again.data.member) throw new Error("invite_link_race");
  return { id: again.data.circle_member_id, name: again.data.member.name, memberUserId: again.data.member.member_id };
}

/**
 * Enregistre la réponse du proche : request_replies, puis les signaux attribués au proche dans la
 * mémoire du demandeur (§ 6.5), et marque le destinataire comme ayant répondu.
 */
export async function submitGuestReply(reply: GuestReply): Promise<SubmitResult> {
  const admin = createAdminClient();
  const r = await recipientByToken(admin, reply.token);
  if (!r?.request || (!r.member && r.request.kind !== "invite")) return { ok: false, reason: "not_found" };
  if (!r.member && !reply.guestName) return { ok: false, reason: "name_required" };
  if (!(await consumeQuota(admin, `token:${reply.token}`, "guest_reply"))) return { ok: false, reason: "quota_exceeded" };

  const member =
    r.member && r.circle_member_id
      ? { id: r.circle_member_id, name: r.member.name, memberUserId: r.member.member_id }
      : await memberForInvite(admin, r.id, r.request.user_id, reply.guestName ?? "");

  const criteria = StoredCriteriaSchema.safeParse(r.request.conversation?.criteria);
  const city = criteria.success ? criteria.data.city : null;
  const occasion = criteria.success ? criteria.data.occasion : null;

  const placeId = await resolvePlace(admin, {
    name: reply.placeName,
    // La ville du lieu choisi prime sur celle de la question.
    city: reply.placeCity ?? city,
    googlePlaceId: reply.googlePlaceId,
    address: reply.placeAddress,
  });
  const visited = visitClaim(reply);

  const inserted = await admin
    .from("request_replies")
    .insert({
      request_id: r.request.id,
      recipient_id: r.id,
      place_id: placeId,
      place_text: reply.placeName,
      place_url: reply.placeUrl,
      visited,
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
      memberId: member.id,
      memberUserId: member.memberUserId,
      replyId: inserted.data.id,
      occasion,
      note: reply.note,
      reusable: reply.reusable,
      visited,
    }),
  );
  if (signals.error) {
    // Pas de réponse sans ses preuves : on retire la réponse orpheline.
    await admin.from("request_replies").delete().eq("id", inserted.data.id);
    throw new Error(signals.error.message);
  }

  const now = new Date().toISOString();
  await admin.from("request_recipients").update({ replied_at: now }).eq("id", r.id);

  return { ok: true, memberName: member.name, requesterName: r.request.requester?.display_name?.trim() || null };
}

/* ---------------------------------------------------------------------------------------------
 * Mémoire du proche (docs/prototype.html, sarahMine / sarahJoin)
 * Le proche voit ce qu'il a lui-même recommandé à ce demandeur, sans compte. S'il crée un compte
 * depuis son lien, ces réponses sont copiées dans SA mémoire (ce sont ses propres mots) et son
 * compte est relié au proche du cercle du demandeur — ce que le demandeur seul voit.
 * ------------------------------------------------------------------------------------------- */

export type GuestMemoryItem = {
  id: string;
  place: string;
  city: string | null;
  note: string | null;
  visited: VisitClaim;
  createdAt: string;
};

export type GuestMemory = { requesterName: string | null; items: GuestMemoryItem[] };

/** Toutes les réponses de ce proche à ce demandeur (même proche du cercle, toutes demandes confondues). */
async function repliesOfMember(admin: Admin, circleMemberId: string) {
  const recipients = await admin.from("request_recipients").select("id").eq("circle_member_id", circleMemberId);
  if (recipients.error) throw new Error(recipients.error.message);
  const ids = recipients.data.map((r) => r.id);
  if (ids.length === 0) return [];
  const replies = await admin
    .from("request_replies")
    .select("id, place_id, place_text, note, visited, created_at, place:places ( name, city )")
    .in("recipient_id", ids)
    .order("created_at", { ascending: false });
  if (replies.error) throw new Error(replies.error.message);
  return replies.data;
}

export async function loadGuestMemory(token: string): Promise<GuestMemory | null> {
  if (!TOKEN.test(token)) return null;
  const admin = createAdminClient();
  const r = await recipientByToken(admin, token);
  if (!r?.request || !r.member || !r.circle_member_id) return null;
  const replies = await repliesOfMember(admin, r.circle_member_id);
  return {
    requesterName: r.request.requester?.display_name?.trim() || null,
    items: replies.map((x) => ({
      id: x.id,
      place: x.place?.name ?? x.place_text ?? "",
      city: x.place?.city ?? null,
      note: x.note,
      visited: x.visited,
      createdAt: x.created_at,
    })),
  };
}

export type ClaimResult =
  | {
      ok: true;
      memberName: string;
      requesterName: string | null;
      /** Réponses désormais présentes dans la mémoire du proche. */
      count: number;
      /** Le demandeur est-il déjà dans le cercle du proche ? Sinon, on le lui propose (jamais d'office). */
      requesterInCircle: boolean;
    }
  | { ok: false; reason: "not_found" | "own_link" | "claimed_by_other" };

/**
 * « Garder ma mémoire WH3RE » : appelé une fois le proche connecté. Relie son compte au proche du
 * cercle du demandeur, puis copie ses réponses dans sa propre mémoire (signaux `manual` à son nom,
 * rattachés à la réponse d'origine). Idempotent : rejouer ne duplique rien.
 */
export async function claimGuestMemory(token: string, userId: string): Promise<ClaimResult> {
  if (!TOKEN.test(token)) return { ok: false, reason: "not_found" };
  const admin = createAdminClient();
  const r = await recipientByToken(admin, token);
  if (!r?.request || !r.member || !r.circle_member_id) return { ok: false, reason: "not_found" };
  if (r.request.user_id === userId) return { ok: false, reason: "own_link" };
  if (r.member.member_id && r.member.member_id !== userId) return { ok: false, reason: "claimed_by_other" };

  if (!r.member.member_id) {
    const linked = await admin
      .from("circle_members")
      .update({ member_id: userId })
      .eq("id", r.circle_member_id)
      .is("member_id", null)
      .select("id");
    if (linked.error) throw new Error(linked.error.message);
    if (linked.data.length === 0) return { ok: false, reason: "claimed_by_other" };
    // Les preuves déjà attribuées à ce proche chez le demandeur pointent désormais vers son compte.
    const backfill = await admin
      .from("signals")
      .update({ source_user_id: userId })
      .eq("source_member_id", r.circle_member_id)
      .is("source_user_id", null);
    if (backfill.error) throw new Error(backfill.error.message);
  }

  const replies = (await repliesOfMember(admin, r.circle_member_id)).filter((x) => x.place_id);
  const ids = replies.map((x) => x.id);
  const already = ids.length
    ? await admin.from("signals").select("request_reply_id").eq("user_id", userId).in("request_reply_id", ids)
    : { data: [], error: null };
  if (already.error) throw new Error(already.error.message);
  const done = new Set(already.data.flatMap((s) => (s.request_reply_id ? [s.request_reply_id] : [])));
  const rows = ownMemorySignals(userId, replies, done);
  if (rows.length) {
    const inserted = await admin.from("signals").insert(rows);
    if (inserted.error) throw new Error(inserted.error.message);
  }

  const inCircle = await admin
    .from("circle_members")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("member_id", r.request.user_id);
  if (inCircle.error) throw new Error(inCircle.error.message);

  return {
    ok: true,
    memberName: r.member.name,
    requesterName: r.request.requester?.display_name?.trim() || null,
    count: replies.length,
    requesterInCircle: (inCircle.count ?? 0) > 0,
  };
}

/**
 * Le demandeur, à ajouter au cercle du proche s'il le confirme. Seule l'identité du demandeur est
 * lue ici (service_role, restreint au jeton) ; l'ajout lui-même passe par le client de la session (RLS).
 */
export async function requesterOfToken(token: string): Promise<{ userId: string; name: string | null } | null> {
  if (!TOKEN.test(token)) return null;
  const r = await recipientByToken(createAdminClient(), token);
  if (!r?.request) return null;
  return { userId: r.request.user_id, name: r.request.requester?.display_name?.trim() || null };
}
