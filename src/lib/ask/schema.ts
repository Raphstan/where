import { z } from "zod";

/**
 * Sortie structurée demandée au modèle. Volontairement simple (pas de bornes) : les bornes
 * sont appliquées ensuite par normalizeUnderstanding, pour rester compatible avec la grammaire
 * des sorties structurées.
 */
export const CriteriaOutputSchema = z.object({
  city: z.string().nullable().describe("Ville, telle que l'utilisateur la nomme"),
  area: z.string().nullable().describe("Quartier ou zone dans la ville"),
  when: z.string().nullable().describe("Moment : « ce soir », « samedi midi », « en novembre »…"),
  party_size: z.number().nullable().describe("Nombre de personnes, si précisé ou implicite"),
  occasion: z
    .string()
    .nullable()
    .describe("Occasion : date, amis, famille, groupe, business, travail, séjour à deux…"),
  place_kind: z
    .string()
    .nullable()
    .describe("Type de lieu recherché : restaurant, bar, café, hôtel, plage, activité…"),
  vibe: z.array(z.string()).describe("Ambiance souhaitée : caché, calme, animé, romantique…"),
  constraints: z
    .array(z.string())
    .describe("Contraintes : pas touristique, enfants bienvenus, disponibilité souhaitée…"),
});

export const ClarificationOutputSchema = z.object({
  question: z.string().describe("Une seule question courte, tutoiement"),
  options: z.array(z.string()).describe("2 à 4 réponses courtes, en minuscules"),
});

export const UnderstandingOutputSchema = z.object({
  criteria: CriteriaOutputSchema,
  tags: z
    .array(z.string())
    .describe(
      "Les critères compris, en chips courtes (1 à 4 mots), en français, dans l'ordre : lieu, moment, personnes, occasion, ambiance, contraintes",
    ),
  clarification: ClarificationOutputSchema.nullable().describe(
    "Une seule question complémentaire si elle change vraiment la réponse, sinon null",
  ),
});

export type UnderstandingOutput = z.infer<typeof UnderstandingOutputSchema>;

/** Forme normalisée renvoyée par /api/ask et utilisée par l'interface. */
export type Criteria = {
  city: string | null;
  area: string | null;
  when: string | null;
  partySize: number | null;
  occasion: string | null;
  placeKind: string | null;
  vibe: string[];
  constraints: string[];
};

export type Clarification = { question: string; options: string[] };

export type Understanding = {
  criteria: Criteria;
  tags: string[];
  clarification: Clarification | null;
};

export const MAX_TAGS = 10;
export const MAX_OPTIONS = 4;

function cleanList(values: readonly string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim().replace(/\s+/g, " ");
    if (!value) continue;
    const key = value.toLocaleLowerCase("fr");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
    if (out.length >= max) break;
  }
  return out;
}

function cleanText(value: string | null): string | null {
  if (value === null) return null;
  const v = value.trim().replace(/\s+/g, " ");
  return v.length ? v : null;
}

/** Applique les bornes et le nettoyage que le schéma du modèle ne garantit pas. */
export function normalizeUnderstanding(output: UnderstandingOutput): Understanding {
  const partySizeRaw = output.criteria.party_size;
  const partySize =
    partySizeRaw !== null && Number.isFinite(partySizeRaw) && partySizeRaw >= 1 && partySizeRaw <= 100
      ? Math.round(partySizeRaw)
      : null;

  const clarificationQuestion = cleanText(output.clarification?.question ?? null);
  const options = output.clarification ? cleanList(output.clarification.options, MAX_OPTIONS) : [];
  const clarification =
    clarificationQuestion && options.length >= 2
      ? { question: clarificationQuestion, options }
      : null;

  return {
    criteria: {
      city: cleanText(output.criteria.city),
      area: cleanText(output.criteria.area),
      when: cleanText(output.criteria.when),
      partySize,
      occasion: cleanText(output.criteria.occasion),
      placeKind: cleanText(output.criteria.place_kind),
      vibe: cleanList(output.criteria.vibe, MAX_TAGS),
      constraints: cleanList(output.criteria.constraints, MAX_TAGS),
    },
    tags: cleanList(output.tags, MAX_TAGS),
    clarification,
  };
}

/** Corps accepté par POST /api/ask. */
export const AskRequestSchema = z.object({
  question: z.string().trim().min(2).max(500),
  clarification: z
    .object({
      question: z.string().trim().min(1).max(300),
      answer: z.string().trim().min(1).max(100),
    })
    .optional(),
});

export type AskRequest = z.infer<typeof AskRequestSchema>;

export type AskResponse = { understanding: Understanding };
