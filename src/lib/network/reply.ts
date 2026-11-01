import { z } from "zod";
import type { EvidenceLevel } from "@/lib/evidence";

/** Réponse à « Tu y es réellement allé·e ? » (maquette : « Oui » / « Non, mais on m’en a parlé »). */
export const VISITED_ANSWERS = ["oui", "non"] as const;
export type VisitedAnswer = (typeof VISITED_ANSWERS)[number];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v.length ? v : null));

/**
 * Formulaire de la page invité, validé côté serveur. Les messages d'erreur sont des clés de
 * messages/{langue}/guest.json (`errors.*`), traduites par l'action.
 */
export const GuestReplySchema = z.object({
  token: z.string().regex(/^[0-9a-f]{32}$/),
  placeName: z.string().trim().min(2, "placeNameRequired").max(120),
  placeUrl: optionalText(500).refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "placeUrlInvalid"),
  visited: z.enum(VISITED_ANSWERS),
  note: optionalText(600),
  visibleOnlyToRequester: z.boolean(),
  reusable: z.boolean(),
});

export type GuestReply = z.infer<typeof GuestReplySchema>;

/**
 * Niveaux de preuve créés par une réponse invité (CLAUDE.md § 6.5) :
 * « Oui » → recommended + visited ; « Non, mais on m’en a parlé » → saved.
 * Jamais de visite sans « Oui » explicite.
 */
export function guestAnswerLevels(visited: VisitedAnswer): EvidenceLevel[] {
  return visited === "oui" ? ["recommended", "visited"] : ["saved"];
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
  visited: VisitedAnswer;
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

export type OwnReply = { id: string; place_id: string | null; visited: boolean; note: string | null };

/**
 * Copie des réponses d'un proche dans SA mémoire quand il crée son compte (« Garder ma mémoire WH3RE ») :
 * mêmes niveaux que chez le demandeur (Oui → recommended + visited, sinon saved), mais à son nom
 * (aucun proche attribué, provenance `manual`), rattachés à la réponse d'origine pour rester idempotent.
 * Les réponses sans lieu reconnu ne sont pas copiées.
 */
export function ownMemorySignals(userId: string, replies: readonly OwnReply[], alreadyCopied: ReadonlySet<string>) {
  return replies
    .filter((r) => r.place_id && !alreadyCopied.has(r.id))
    .flatMap((r) =>
      guestAnswerLevels(r.visited ? "oui" : "non").map((level, i) => ({
        user_id: userId,
        place_id: r.place_id as string,
        request_reply_id: r.id,
        evidence_level: level,
        note: i === 0 ? r.note : null,
        source_type: "manual" as const,
      })),
    );
}
