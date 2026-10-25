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

/** Formulaire de la page invité, validé côté serveur. */
export const GuestReplySchema = z.object({
  token: z.string().regex(/^[0-9a-f]{32}$/),
  placeName: z.string().trim().min(2, "Indique le nom du lieu.").max(120),
  placeUrl: optionalText(500).refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "Ce lien ne semble pas valide."),
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
