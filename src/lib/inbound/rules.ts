import { z } from "zod";
import type { EvidenceLevel } from "@/lib/evidence";
import type { Database } from "@/lib/supabase/database.types";

type DbKind = Database["public"]["Enums"]["forwarded_email_kind"];
type DbStatus = Database["public"]["Enums"]["forwarded_email_status"];

/* ---------------------------------------------------------------------------
 * Classification d'un email transféré
 * ------------------------------------------------------------------------- */

/** Doit rester identique à l'enum Postgres `forwarded_email_kind`. */
export const EMAIL_KINDS = ["table", "hotel", "activity", "delivery", "cancellation", "other"] as const satisfies readonly DbKind[];
export type EmailKind = (typeof EMAIL_KINDS)[number];

type MissingKind = Exclude<DbKind, EmailKind>;
const _everyDbKindIsCovered: MissingKind extends never ? true : never = true;
void _everyDbKindIsCovered;

/** Les trois sortes de réservation : seules elles passent par la qualification. */
export const RESERVATION_KINDS = ["table", "hotel", "activity"] as const satisfies readonly EmailKind[];
export type ReservationKind = (typeof RESERVATION_KINDS)[number];

export function isReservation(kind: EmailKind): kind is ReservationKind {
  return (RESERVATION_KINDS as readonly string[]).includes(kind);
}

export type EmailStatus = DbStatus;

/**
 * Statut à la réception. Une réservation attend la validation de l'utilisateur ; livraisons,
 * annulations et autres emails sont écartés (et comptés), jamais qualifiés.
 */
export function initialStatus(kind: EmailKind): EmailStatus {
  return isReservation(kind) ? "pending" : "excluded";
}

/** Une livraison ou une réservation annulée ne compte jamais comme visite, quoi qu'on réponde. */
export function canCountAsVisit(kind: EmailKind): boolean {
  return isReservation(kind);
}

/* ---------------------------------------------------------------------------
 * Qualifier mes expériences (maquette scrQualify)
 * ------------------------------------------------------------------------- */

export const VISITED_ANSWERS = ["Oui", "Non", "Je ne sais plus"] as const;
export type VisitedAnswer = (typeof VISITED_ANSWERS)[number];

export const RECOMMEND_ANSWERS = ["Absolument", "Oui, dans certains contextes", "Pas vraiment", "Non"] as const;
export type RecommendAnswer = (typeof RECOMMEND_ANSWERS)[number];

/** « Pas vraiment » et « Non » terminent la carte : ni occasion ni note. */
export const RECOMMEND_ENDS = ["Pas vraiment", "Non"] as const satisfies readonly RecommendAnswer[];

/** Occasions proposées, mot pour mot (maquette OCC). */
export const OCCASIONS = [
  "date",
  "amis",
  "groupe",
  "famille",
  "business",
  "calme",
  "fête",
  "occasion spéciale",
  "déjeuner",
  "touristes",
] as const;

export const QUALIFY_TEXT = {
  eyebrow: "Qualifier mes expériences",
  visited: "Tu y es vraiment allé ?",
  recommend: "Tu le recommanderais ?",
  occasion: "Pour quelle occasion ?",
  note: "Une chose à savoir ?",
  noteHint: "Facultatif · ex. « Très bonne ambiance, mais la musique devient forte après 22 h. »",
  notePlaceholder: "Écris une phrase…",
  continue: "Continuer",
  skipNote: "Passer",
  save: "Enregistrer",
  skipPlace: "Ignorer ce lieu",
  doneTitle: "Ta mémoire commence à se former.",
  doneLead: (n: number) =>
    `${n} lieux qualifiés. WHERE saura désormais ce qui compte vraiment pour toi, pas seulement où tu as réservé.`,
  doneCta: "Créer mon cercle de confiance",
} as const;

export const QualificationSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("skip") }),
  z
    .object({
      action: z.literal("qualify"),
      visited: z.enum(VISITED_ANSWERS),
      recommend: z.enum(RECOMMEND_ANSWERS).nullable(),
      occasion: z.array(z.enum(OCCASIONS)).max(OCCASIONS.length),
      note: z.string().trim().max(600).nullable(),
    })
    .superRefine((v, ctx) => {
      if (v.visited !== "Oui" && (v.recommend !== null || v.occasion.length > 0 || v.note)) {
        ctx.addIssue({ code: "custom", message: "Sans visite, pas de recommandation." });
      }
      if (v.visited === "Oui" && v.recommend === null) {
        ctx.addIssue({ code: "custom", path: ["recommend"], message: "Dis-moi si tu le recommanderais." });
      }
      if (v.recommend && (RECOMMEND_ENDS as readonly string[]).includes(v.recommend) && (v.occasion.length > 0 || v.note)) {
        ctx.addIssue({ code: "custom", message: "Pas d’occasion pour un lieu que tu ne recommandes pas." });
      }
    }),
]);

export type Qualification = z.infer<typeof QualificationSchema>;
export type QualifyAnswers = Extract<Qualification, { action: "qualify" }>;

/**
 * Signaux créés par la validation d'une réservation (CLAUDE.md § 6.5) :
 * - « Non » → rien, la réservation est ignorée ;
 * - « Je ne sais plus » → `booked` seulement : réservé, pas visité ;
 * - « Oui » → `booked` (la réservation) et `visited`, ou `recommended` avec « Absolument ».
 * Une livraison ou une annulation ne crée jamais rien, quelles que soient les réponses.
 */
export function qualificationLevels(kind: EmailKind, answers: Pick<QualifyAnswers, "visited" | "recommend">): EvidenceLevel[] {
  if (!canCountAsVisit(kind)) return [];
  switch (answers.visited) {
    case "Non":
      return [];
    case "Je ne sais plus":
      return ["booked"];
    case "Oui":
      return ["booked", answers.recommend === "Absolument" ? "recommended" : "visited"];
  }
}

/**
 * Résumé de fin de pile, mot pour mot (maquette scrQualify) : le texte et la pastille.
 * `null` = lieu ignoré.
 */
export function qualificationSummary(
  answers: Pick<QualifyAnswers, "visited" | "recommend" | "occasion"> | null,
): { text: string; level: EvidenceLevel } {
  if (!answers) return { text: "Ignoré", level: "booked" };
  const occ = answers.occasion.length ? ` · ${answers.occasion.join(", ")}` : "";
  switch (answers.visited) {
    case "Oui":
      if (answers.recommend === "Absolument") return { text: `Visité · tu le recommandes${occ}`, level: "recommended" };
      return { text: `${answers.recommend ? `Visité · ${answers.recommend.toLocaleLowerCase("fr")}` : "Visité"}${occ}`, level: "visited" };
    case "Non":
      return { text: "Réservé, non visité — ignoré", level: "public" };
    case "Je ne sais plus":
      return { text: "Réservé, présence incertaine", level: "booked" };
  }
}

/* ---------------------------------------------------------------------------
 * Résultats de l'import (maquette scrGmailResults)
 * ------------------------------------------------------------------------- */

const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const LONG_DATE = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** « 12 sept. 2026 » ou, sans l'année, « 12 sept. » ; la date est un jour (AAAA-MM-JJ). */
export function formatDay(day: string | null, withYear: boolean): string | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return (withYear ? LONG_DATE : SHORT_DATE).format(date);
}

/** Libellé de provenance : « Réservation Tabit », « Confirmation hôtel », « Activité ». */
export function provenanceLabel(kind: ReservationKind, platform: string | null): string {
  switch (kind) {
    case "table":
      return platform ? `Réservation ${platform}` : "Réservation";
    case "hotel":
      return "Confirmation hôtel";
    case "activity":
      return "Activité";
  }
}

/** Badge de la liste : « Réservé », « Hôtel », « Activité ». */
export const KIND_BADGE: Readonly<Record<ReservationKind, string>> = {
  table: "Réservé",
  hotel: "Hôtel",
  activity: "Activité",
};

export type ImportedEmail = {
  id: string;
  kind: EmailKind;
  status: EmailStatus;
  platform: string | null;
  placeName: string | null;
  city: string | null;
  reservedFor: string | null;
};

export type ImportSummary = {
  restaurants: ImportedEmail[];
  hotels: ImportedEmail[];
  activities: ImportedEmail[];
  deliveries: ImportedEmail[];
  cancellations: ImportedEmail[];
  pending: number;
  /** Au moins une réservation, et aucune venue d'Ontopo. */
  noOntopo: boolean;
  /** Toutes les livraisons écartées viennent de Tabit. */
  deliveriesAllTabit: boolean;
};

/** Regroupe les emails reçus pour l'écran de résultats. Les réservations annulées n'y figurent pas. */
export function summarizeImport(emails: readonly ImportedEmail[]): ImportSummary {
  const live = emails.filter((e) => isReservation(e.kind) && e.status !== "cancelled");
  const deliveries = emails.filter((e) => e.kind === "delivery");
  const cancellations = emails.filter((e) => e.kind === "cancellation");
  return {
    restaurants: live.filter((e) => e.kind === "table"),
    hotels: live.filter((e) => e.kind === "hotel"),
    activities: live.filter((e) => e.kind === "activity"),
    deliveries,
    cancellations,
    pending: live.filter((e) => e.status === "pending").length,
    noOntopo: live.length > 0 && !live.some((e) => /ontopo/i.test(e.platform ?? "")),
    deliveriesAllTabit: deliveries.length > 0 && deliveries.every((e) => /tabit/i.test(e.platform ?? "")),
  };
}
