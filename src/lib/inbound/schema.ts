import { z } from "zod";
import { EMAIL_KINDS, isReservation, type EmailKind } from "./rules";

/**
 * Sortie structurée demandée au modèle. Volontairement simple : les bornes et le nettoyage sont
 * appliqués ensuite par normalizeClassification.
 */
export const ClassificationOutputSchema = z.object({
  kind: z
    .enum(EMAIL_KINDS)
    .describe("table, hotel, activity, delivery, cancellation ou other"),
  place_name: z.string().nullable().describe("Nom du restaurant, de l'hôtel ou de l'activité, tel qu'écrit"),
  city: z.string().nullable().describe("Ville du lieu, si elle est indiquée"),
  platform: z
    .string()
    .nullable()
    .describe("Plateforme émettrice : Tabit, Ontopo, Resy, OpenTable, Booking, Wolt… sinon null"),
  reserved_for: z
    .string()
    .nullable()
    .describe("Date de la réservation, de l'arrivée ou de l'activité, au format AAAA-MM-JJ, sinon null"),
});

export type ClassificationOutput = z.infer<typeof ClassificationOutputSchema>;

export type Classification = {
  kind: EmailKind;
  placeName: string | null;
  city: string | null;
  platform: string | null;
  /** AAAA-MM-JJ. */
  reservedFor: string | null;
};

/** Email transféré, tel qu'envoyé au classifieur. */
export type ForwardedEmail = { subject: string | null; text: string };

function clean(value: string | null, max: number): string | null {
  if (value === null) return null;
  const v = value.trim().replace(/\s+/g, " ");
  return v.length ? v.slice(0, max) : null;
}

function cleanDay(value: string | null): string | null {
  const v = clean(value, 10);
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v) ? v : null;
}

/**
 * Bornes que le schéma du modèle ne garantit pas. Une réservation sans nom de lieu ne peut pas
 * être qualifiée : elle devient « other ».
 */
export function normalizeClassification(output: ClassificationOutput): Classification {
  const placeName = clean(output.place_name, 200);
  const kind = isReservation(output.kind) && !placeName ? "other" : output.kind;
  return {
    kind,
    placeName,
    city: clean(output.city, 120),
    platform: clean(output.platform, 60),
    reservedFor: cleanDay(output.reserved_for),
  };
}
