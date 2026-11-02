import { z } from "zod";
import type { EvidenceLevel } from "@/lib/evidence";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length ? v : null));

/**
 * Formulaire de la page invité, validé côté serveur. Les messages d'erreur sont des clés de
 * messages/{langue}/guest.json (`errors.*`), traduites par l'action.
 *
 * Depuis le premier test réel (2026-11-02), la page tient en un geste : le proche choisit le lieu
 * parmi les suggestions Google (identifiant, adresse, ville) ou tape son nom, et peut cocher
 * « Je n'y suis pas encore allé·e ». Plus de question « Tu y es réellement allé·e ? » ni
 * d'interrupteurs : la réponse reste visible du seul demandeur et réutilisable pour lui.
 */
export const GuestReplySchema = z.object({
  token: z.string().regex(/^[0-9a-f]{32}$/),
  /** Lien d'invitation seulement : le prénom que le proche donne (on ne le connaît pas encore). */
  guestName: optionalText(60).optional(),
  placeName: z.string().trim().min(2, "placeNameRequired").max(120),
  placeUrl: optionalText(500).refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "placeUrlInvalid"),
  /** Lieu choisi parmi les suggestions Google : de quoi le retrouver sans ambiguïté. */
  googlePlaceId: optionalText(300).refine((v) => v === null || /^[A-Za-z0-9_-]{10,300}$/.test(v)),
  placeAddress: optionalText(300),
  placeCity: optionalText(80),
  /** « Je n'y suis pas encore allé·e » : on lui en a parlé, il ne l'a pas testé. */
  notYet: z.boolean(),
  note: optionalText(600),
  visibleOnlyToRequester: z.boolean(),
  reusable: z.boolean(),
});

export type GuestReply = z.infer<typeof GuestReplySchema>;

/**
 * Ce que la réponse affirme de la visite (colonne request_replies.visited) :
 * true « Oui, j'y suis allé·e » (anciennes réponses), null recommandation sans visite affirmée,
 * false « pas encore allé·e ».
 */
export type VisitClaim = boolean | null;

export function visitClaim(reply: Pick<GuestReply, "notYet">): VisitClaim {
  return reply.notYet ? false : null;
}

/**
 * Niveaux de preuve créés par une réponse invité (CLAUDE.md § 6.5) :
 * lieu préféré cité → recommended ; « pas encore allé·e » → saved ;
 * « Oui » explicite (anciennes réponses) → recommended + visited.
 * Jamais de visite sans « Oui » explicite.
 */
export function guestAnswerLevels(visited: VisitClaim): EvidenceLevel[] {
  if (visited === true) return ["recommended", "visited"];
  return visited === null ? ["recommended"] : ["saved"];
}

export type ReplySignalInput = {
  userId: string;
  placeId: string;
  memberId: string;
  memberUserId: string | null;
  replyId: string;
  occasion: string | null;
  note: string | null;
  reusable: boolean;
  visited: VisitClaim;
};

/**
 * Lignes `signals` à insérer pour une réponse : attribuées au proche (source_member_id), dans la
 * mémoire du demandeur (user_id), provenance `network_reply`. La note n'est portée qu'une fois.
 */
export function replySignals(input: ReplySignalInput) {
  return guestAnswerLevels(input.visited).map((level, i) => ({
    user_id: input.userId,
    place_id: input.placeId,
    source_member_id: input.memberId,
    source_user_id: input.memberUserId,
    request_reply_id: input.replyId,
    evidence_level: level,
    occasion: input.occasion ? [input.occasion] : [],
    note: i === 0 ? input.note : null,
    source_type: "network_reply" as const,
    reusable: input.reusable,
  }));
}

export type OwnReply = { id: string; place_id: string | null; visited: VisitClaim; note: string | null };

/**
 * Copie des réponses d'un proche dans SA mémoire quand il crée son compte (« Garder ma mémoire WH3RE ») :
 * mêmes niveaux que chez le demandeur (guestAnswerLevels), mais à son nom
 * (aucun proche attribué, provenance `manual`), rattachés à la réponse d'origine pour rester idempotent.
 * Les réponses sans lieu reconnu ne sont pas copiées.
 */
export function ownMemorySignals(userId: string, replies: readonly OwnReply[], alreadyCopied: ReadonlySet<string>) {
  return replies
    .filter((r) => r.place_id && !alreadyCopied.has(r.id))
    .flatMap((r) =>
      guestAnswerLevels(r.visited).map((level, i) => ({
        user_id: userId,
        place_id: r.place_id as string,
        request_reply_id: r.id,
        evidence_level: level,
        note: i === 0 ? r.note : null,
        source_type: "manual" as const,
      })),
    );
}
