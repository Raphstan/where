import { z } from "zod";
import type { T } from "@/i18n/translator";
import type { EvidenceLevel } from "@/lib/evidence";
import type { RichText } from "@/lib/search/types";

/**
 * Texte riche dont seul le nom du lieu est en gras : la phrase entière vit dans les messages
 * (pour que chaque langue place le nom où il faut), le nom y est repéré par un marqueur.
 */
const MARK = "\uE000";
function withStrongPlace(t: T, key: string, placeName: string): RichText {
  const [before = "", after = ""] = t(key, { place: MARK }).split(MARK);
  return [...(before ? [{ text: before }] : []), { text: placeName, strong: true }, ...(after ? [{ text: after }] : [])];
}

/* ---------------------------------------------------------------------------
 * Au retour : « De retour. As-tu réservé chez {Lieu} ? » (maquette backFrom)
 * Textes : messages/{langue}/booking.json, `booked.*`. `t` : traducteur de l'espace `booking`.
 * ------------------------------------------------------------------------- */

/** Réponses, dans l'ordre de la maquette : « Oui », « Pas encore », « J’ai choisi un autre endroit ». */
export const BOOKED_ANSWERS = ["yes", "notYet", "otherPlace"] as const;
export type BookedAnswer = (typeof BOOKED_ANSWERS)[number];

export function bookedQuestion(t: T, placeName: string): string {
  return t("booked.question", { place: placeName });
}

/** Libellé d'une réponse (« Oui »…). */
export function bookedAnswerLabel(t: T, answer: BookedAnswer): string {
  return t(`booked.answers.${answer}`);
}

/** Réponse correspondant à un libellé affiché (choix d'une bulle à options), sinon null. */
export function bookedAnswerFromLabel(t: T, label: string): BookedAnswer | null {
  return BOOKED_ANSWERS.find((a) => bookedAnswerLabel(t, a) === label) ?? null;
}

/**
 * Niveau de preuve d'une réponse au retour. « Oui » → `booked`, jamais `visited` : une réservation
 * n'est pas une visite tant que l'utilisateur ne l'a pas confirmée (CLAUDE.md § 2.4).
 */
export function bookedAnswerLevel(answer: BookedAnswer): EvidenceLevel | null {
  return answer === "yes" ? "booked" : null;
}

/** Réponses de WH3RE, mot pour mot (maquette pick). Le nom du lieu est en gras. */
export function bookedReply(t: T, answer: BookedAnswer, placeName: string): RichText {
  switch (answer) {
    case "yes":
      return withStrongPlace(t, "booked.reply.yes", placeName);
    case "notYet":
      return [{ text: t("booked.reply.notYet") }];
    case "otherPlace":
      return [{ text: t("booked.reply.otherPlace") }];
  }
}

/* ---------------------------------------------------------------------------
 * Le lendemain : retour après visite en trois questions (maquette feedbackMsg)
 * Les valeurs ci-dessous sont des codes stockés (contraintes de visit_followups et
 * signals.occasion) : elles restent en français. Libellés affichés : booking.json, `feedback.*`.
 * ------------------------------------------------------------------------- */

export const NOT_VISITED = "Je n’y suis finalement pas allé";
export const RATINGS = ["Excellent", "Bien", "Moyen", "Pas pour moi", NOT_VISITED] as const;
export type Rating = (typeof RATINGS)[number];

export const RECOMMEND_ANSWERS = ["Absolument", "Dans certains contextes", "Pas vraiment"] as const;
export type RecommendAnswer = (typeof RECOMMEND_ANSWERS)[number];

/** Contextes proposés à « Pour quel contexte ? », mot pour mot. */
export const FEEDBACK_CONTEXTS = ["date", "amis", "calme", "occasion spéciale", "déjeuner"] as const;
export type FeedbackContext = (typeof FEEDBACK_CONTEXTS)[number];

const RATING_KEY: Record<Rating, string> = {
  Excellent: "excellent",
  Bien: "good",
  Moyen: "average",
  "Pas pour moi": "notForMe",
  [NOT_VISITED]: "notVisited",
};

const RECOMMEND_KEY: Record<RecommendAnswer, string> = {
  Absolument: "absolutely",
  "Dans certains contextes": "someContexts",
  "Pas vraiment": "notReally",
};

const CONTEXT_KEY: Record<FeedbackContext, string> = {
  date: "date",
  amis: "friends",
  calme: "quiet",
  "occasion spéciale": "specialOccasion",
  déjeuner: "lunch",
};

/** Libellé affiché d'une note (« Excellent »…). `t` : traducteur de l'espace `booking`. */
export function ratingLabel(t: T, rating: Rating): string {
  return t(`feedback.ratings.${RATING_KEY[rating]}`);
}

/** Libellé affiché d'une réponse à « Tu le recommanderais à quelqu’un ? ». */
export function recommendLabel(t: T, answer: RecommendAnswer): string {
  return t(`feedback.recommendAnswers.${RECOMMEND_KEY[answer]}`);
}

/** Libellé affiché d'un contexte (« date », « amis »…). */
export function contextLabel(t: T, context: FeedbackContext): string {
  return t(`feedback.contexts.${CONTEXT_KEY[context]}`);
}

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
