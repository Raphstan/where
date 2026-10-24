import { describe, expect, it } from "vitest";
import {
  AskRequestSchema,
  MAX_TAGS,
  normalizeUnderstanding,
  type UnderstandingOutput,
} from "./schema";

const raw = (over: Partial<UnderstandingOutput> = {}): UnderstandingOutput => ({
  criteria: {
    city: " Tel Aviv ",
    area: null,
    when: "ce soir",
    party_size: 2,
    occasion: "date",
    place_kind: null,
    vibe: ["caché", "Caché", " calme "],
    constraints: [],
  },
  tags: ["Tel Aviv", "ce soir", "deux personnes", "date", "caché"],
  clarification: {
    question: "Plutôt restaurant, bar ou les deux ?",
    options: ["restaurant", "bar", "les deux", "surprends-moi"],
  },
  ...over,
});

describe("normalizeUnderstanding", () => {
  it("nettoie les textes et déduplique les listes sans tenir compte de la casse", () => {
    const u = normalizeUnderstanding(raw());
    expect(u.criteria.city).toBe("Tel Aviv");
    expect(u.criteria.vibe).toEqual(["caché", "calme"]);
    expect(u.criteria.partySize).toBe(2);
  });

  it("garde au plus une question complémentaire avec 2 à 4 options", () => {
    const u = normalizeUnderstanding(raw());
    expect(u.clarification).toEqual({
      question: "Plutôt restaurant, bar ou les deux ?",
      options: ["restaurant", "bar", "les deux", "surprends-moi"],
    });

    const six = normalizeUnderstanding(
      raw({ clarification: { question: "Où ?", options: ["a", "b", "c", "d", "e", "f"] } }),
    );
    expect(six.clarification?.options).toHaveLength(4);
  });

  it("supprime une question complémentaire inutilisable (moins de deux options, question vide)", () => {
    expect(
      normalizeUnderstanding(raw({ clarification: { question: "Où ?", options: ["a"] } })).clarification,
    ).toBeNull();
    expect(
      normalizeUnderstanding(raw({ clarification: { question: "  ", options: ["a", "b"] } }))
        .clarification,
    ).toBeNull();
    expect(normalizeUnderstanding(raw({ clarification: null })).clarification).toBeNull();
  });

  it("borne le nombre de chips et rejette un nombre de personnes absurde", () => {
    const many = Array.from({ length: 20 }, (_, i) => `chip ${i}`);
    const u = normalizeUnderstanding(raw({ tags: many }));
    expect(u.tags).toHaveLength(MAX_TAGS);

    const zero = raw();
    zero.criteria.party_size = 0;
    expect(normalizeUnderstanding(zero).criteria.partySize).toBeNull();

    const frac = raw();
    frac.criteria.party_size = 2.4;
    expect(normalizeUnderstanding(frac).criteria.partySize).toBe(2);
  });
});

describe("AskRequestSchema", () => {
  it("accepte une question et une précision optionnelle", () => {
    expect(AskRequestSchema.safeParse({ question: "Un bar animé" }).success).toBe(true);
    expect(
      AskRequestSchema.safeParse({
        question: "Un bar animé",
        clarification: { question: "Restaurant ou bar ?", answer: "bar" },
      }).success,
    ).toBe(true);
  });

  it("rejette une question vide, trop longue ou un corps malformé", () => {
    expect(AskRequestSchema.safeParse({ question: " " }).success).toBe(false);
    expect(AskRequestSchema.safeParse({ question: "x".repeat(501) }).success).toBe(false);
    expect(AskRequestSchema.safeParse(null).success).toBe(false);
    expect(
      AskRequestSchema.safeParse({ question: "ok", clarification: { question: "q" } }).success,
    ).toBe(false);
  });
});
