import { z } from "zod";
import type { EvidenceLevel } from "@/lib/evidence";
import type { RichText } from "@/lib/search/types";

/* ---------------------------------------------------------------------------
 * Au retour : « De retour. As-tu réservé chez {Lieu} ? » (maquette backFrom)
 * ------------------------------------------------------------------------- */

export const BOOKED_ANSWERS = ["Oui", "Pas encore", "J’ai choisi un autre endroit"] as const;
export type BookedAnswer = (typeof BOOKED_ANSWERS)[number];

export function bookedQuestion(placeName: string): string {
  return `De retour. As-tu réservé chez ${placeName} ?`;
}

/**
 * Niveau de preuve d'une réponse au retour. « Oui » → `booked`, jamais `visited` : une réservation
 * n'est pas une visite tant que l'utilisateur ne l'a pas confirmée (CLAUDE.md § 2.4).
 */
export function bookedAnswerLevel(answer: BookedAnswer): EvidenceLevel | null {
  return answer === "Oui" ? "booked" : null;
}

/** Réponses de WHERE, mot pour mot (maquette pick). Le nom du lieu est en gras. */
export function bookedReply(answer: BookedAnswer, placeName: string): RichText {
  switch (answer) {
    case "Oui":
      return [
        { text: "Parfait. Je garde " },
        { text: placeName, strong: true },
        { text: " dans ta mémoire comme réservé — pas encore comme visité. Je te demanderai demain comment c’était." },
      ];
    case "Pas encore":
      return [{ text: "Pas de souci. Je laisse la table ouverte dans ta conversation — dis-moi si tu veux une autre heure ou un autre lieu." }];
    case "J’ai choisi un autre endroit":
      return [{ text: "Compris. Je ne compte pas cette réservation. Tu veux me dire où tu vas finalement ? Ça enrichira ta mémoire." }];
  }
}

/* ---------------------------------------------------------------------------
 * Le lendemain : retour après visite en trois questions (maquette feedbackMsg)
 * ------------------------------------------------------------------------- */

export const NOT_VISITED = "Je n’y suis finalement pas allé";
export const RATINGS = ["Excellent", "Bien", "Moyen", "Pas pour moi", NOT_VISITED] as const;
export type Rating = (typeof RATINGS)[number];

export const RECOMMEND_ANSWERS = ["Absolument", "Dans certains contextes", "Pas vraiment"] as const;
export type RecommendAnswer = (typeof RECOMMEND_ANSWERS)[number];

/** Contextes proposés à « Pour quel contexte ? », mot pour mot. */
export const FEEDBACK_CONTEXTS = ["date", "amis", "calme", "occasion spéciale", "déjeuner"] as const;

export const FEEDBACK_TEXT = {
  rating: (placeName: string) => ({ before: "Alors, ", strong: placeName, after: " ?" }),
  recommend: "Tu le recommanderais à quelqu’un ?",
  context: "Pour quel contexte ?",
  skip: "Passer",
  notVisited: "Pas de problème — je ne compte pas cette visite.",
  thanks: (recommended: boolean) => ({
    before: "Merci. C’est noté dans ",
    strong: "ta mémoire",
    after: `${recommended ? " comme un lieu que tu recommandes" : ""}. Ça affinera mes prochaines réponses.`,
  }),
  share: "Partager ce retour avec mon cercle privé",
  shareNote: "Désactivé par défaut. Jamais publié publiquement.",
  shared: "Partagé avec ton cercle privé",
  kept: "Retour gardé pour toi",
  memory: "Voir ma mémoire",
  newQuestion: "Nouvelle question",
} as const;

/** Réponses du retour, validées côté serveur. Sans visite, ni recommandation ni contexte. */
export const FeedbackSchema = z
  .object({
    rating: z.enum(RATINGS),
    recommend: z.enum(RECOMMEND_ANSWERS).nullable(),
    occasion: z.array(z.enum(FEEDBACK_CONTEXTS)).max(FEEDBACK_CONTEXTS.length),
  })
  .superRefine((v, ctx) => {
    if (v.rating === NOT_VISITED && (v.recommend !== null || v.occasion.length > 0)) {
      ctx.addIssue({ code: "custom", message: "Sans visite, pas de recommandation." });
    }
    if (v.rating !== NOT_VISITED && v.recommend === null) {
      ctx.addIssue({ code: "custom", path: ["recommend"], message: "Dis-moi si tu le recommanderais." });
    }
  });

export type Feedback = z.infer<typeof FeedbackSchema>;

/**
 * Niveau de preuve créé par le retour (même règle que la qualification, CLAUDE.md § 6.5) :
 * « Je n’y suis finalement pas allé » → aucun signal ; visité + « Absolument » → `recommended` ;
 * toute autre visite → `visited`.
 */
export function feedbackLevel(feedback: Pick<Feedback, "rating" | "recommend">): EvidenceLevel | null {
  if (feedback.rating === NOT_VISITED) return null;
  return feedback.recommend === "Absolument" ? "recommended" : "visited";
}

export const ShareSchema = z.object({ shared: z.boolean() });

/* ---------------------------------------------------------------------------
 * Échéance : le lendemain matin
 * ------------------------------------------------------------------------- */

/** Fuseau des lieux du MVP (Tel Aviv). Le cron tourne une fois par jour, après cette heure. */
export const FOLLOWUP_TIME_ZONE = "Asia/Jerusalem";
export const FOLLOWUP_HOUR = 8;

function localParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** Décalage du fuseau à cet instant, en millisecondes (heure locale − UTC). */
function offsetMs(date: Date, timeZone: string): number {
  const p = localParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Le lendemain de la réservation, à 8 h heure d'Israël (heure d'été comprise). Le cron Vercel rend
 * le retour « dû » à son passage suivant (vercel.json).
 */
export function followUpDueAt(bookedAt: Date, timeZone = FOLLOWUP_TIME_ZONE): Date {
  const p = localParts(bookedAt, timeZone);
  const naive = new Date(Date.UTC(p.year, p.month - 1, p.day + 1, FOLLOWUP_HOUR));
  return new Date(naive.getTime() - offsetMs(naive, timeZone));
}

/* ---------------------------------------------------------------------------
 * API
 * ------------------------------------------------------------------------- */

/**
 * « Oui » au retour : le lieu de la mémoire (id) ou la découverte Google Places, enregistrée alors
 * comme lieu (fait partagé, sans aucun signal attribué à personne).
 */
export const CreateBookingSchema = z.object({
  place: z.union([
    z.object({ id: z.guid() }),
    z.object({
      googlePlaceId: z.string().trim().min(1).max(300),
      name: z.string().trim().min(1).max(200),
      address: z.string().trim().max(300).nullable(),
    }),
  ]),
  conversationId: z.guid().nullable(),
});

export type CreateBooking = z.infer<typeof CreateBookingSchema>;

/** Retour proposé dans le chat : le cron l'a rendu dû, l'utilisateur n'a pas encore répondu. */
export type DueFollowup = { id: string; placeName: string; conversationId: string | null; bookedAt: string };
