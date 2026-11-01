import { z } from "zod";
import type { T } from "@/i18n/translator";
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

export type Occasion = (typeof OCCASIONS)[number];

/*
 * Les réponses et les occasions restent des valeurs françaises en base et dans l'API ; leurs libellés
 * vivent dans messages/{langue}/import.json (`qualify.*`, `occasions.*`), via ces clés.
 */
export const VISITED_KEY: Readonly<Record<VisitedAnswer, string>> = {
  Oui: "yes",
  Non: "no",
  "Je ne sais plus": "unsure",
};

export const RECOMMEND_KEY: Readonly<Record<RecommendAnswer, string>> = {
  Absolument: "absolutely",
  "Oui, dans certains contextes": "someContexts",
  "Pas vraiment": "notReally",
  Non: "no",
};

export const OCCASION_KEY: Readonly<Record<Occasion, string>> = {
  date: "date",
  amis: "friends",
  groupe: "group",
  famille: "family",
  business: "business",
  calme: "quiet",
  fête: "party",
  "occasion spéciale": "special",
  déjeuner: "lunch",
  touristes: "tourists",
};

/** Libellé d'une occasion dans la langue de l'utilisateur (`t` : espace « import »). */
export function occasionLabel(t: T, occasion: Occasion): string {
  return t(`occasions.${OCCASION_KEY[occasion]}`);
}

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
 * `null` = lieu ignoré. `t` : espace « import ».
 */
export function qualificationSummary(
  t: T,
  answers: Pick<QualifyAnswers, "visited" | "recommend" | "occasion"> | null,
): { text: string; level: EvidenceLevel } {
  if (!answers) return { text: t("summary.ignored"), level: "booked" };
  const occ = answers.occasion.length ? ` · ${answers.occasion.map((o) => occasionLabel(t, o)).join(", ")}` : "";
  switch (answers.visited) {
    case "Oui":
      if (answers.recommend === "Absolument") return { text: `${t("summary.recommends")}${occ}`, level: "recommended" };
      return {
        text: `${
          answers.recommend
            ? t("summary.visitedWith", { answer: t(`qualify.recommendAnswers.${RECOMMEND_KEY[answers.recommend]}`).toLocaleLowerCase() })
            : t("summary.visited")
        }${occ}`,
        level: "visited",
      };
    case "Non":
      return { text: t("summary.notVisited"), level: "public" };
    case "Je ne sais plus":
      return { text: t("summary.unsure"), level: "booked" };
  }
}

/* ---------------------------------------------------------------------------
 * Résultats de l'import (maquette scrGmailResults)
 * ------------------------------------------------------------------------- */

/** « 12 sept. 2026 » ou, sans l'année, « 12 sept. » ; la date est un jour (AAAA-MM-JJ). */
export function formatDay(day: string | null, withYear: boolean, locale: string): string | null {
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(date);
}

/** Libellé de provenance : « Réservation Tabit », « Confirmation hôtel », « Activité ». `t` : espace « import ». */
export function provenanceLabel(t: T, kind: ReservationKind, platform: string | null): string {
  switch (kind) {
    case "table":
      return platform ? t("provenance.tableOn", { platform }) : t("provenance.table");
    case "hotel":
      return t("provenance.hotel");
    case "activity":
      return t("provenance.activity");
  }
}

/** Badge de la liste : « Réservé », « Hôtel », « Activité » (clé `badge.{kind}` de l'espace « import »). */
export function kindBadge(t: T, kind: ReservationKind): string {
  return t(`badge.${kind}`);
}

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
