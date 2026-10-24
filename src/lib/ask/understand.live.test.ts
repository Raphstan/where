import { describe, expect, it } from "vitest";
import { EXAMPLE_QUESTIONS } from "./examples";
import { understandQuestion } from "./understand";

/**
 * Test en direct contre l'API Anthropic sur les six questions de la maquette.
 * Lancer : npm run test:live (ANTHROPIC_API_KEY requis dans .env.local). Ignoré sinon.
 */
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

describe.skipIf(!hasKey)("compréhension des six questions de la maquette", () => {
  const byKey = Object.fromEntries(EXAMPLE_QUESTIONS.map((e) => [e.key, e.text]));

  it("date : Tel Aviv, ce soir, à deux, caché, et une seule question de précision", async () => {
    const u = await understandQuestion({ question: byKey.date });
    expect(u.criteria.city?.toLowerCase()).toContain("tel aviv");
    expect(u.criteria.when?.toLowerCase()).toContain("soir");
    expect(u.criteria.partySize).toBe(2);
    expect(u.tags.length).toBeGreaterThanOrEqual(4);
    expect(u.tags.join(" ").toLowerCase()).toMatch(/cach/);
    expect(u.clarification).not.toBeNull();
    expect(u.clarification?.options.length).toBeGreaterThanOrEqual(2);
  });

  it("date, après la réponse : plus de question, le type de lieu est intégré", async () => {
    const first = await understandQuestion({ question: byKey.date });
    const answer = first.clarification?.options[0] ?? "les deux";
    const u = await understandQuestion({
      question: byKey.date,
      clarification: { question: first.clarification?.question ?? "Plutôt restaurant, bar ou les deux ?", answer },
    });
    expect(u.clarification).toBeNull();
    expect(u.criteria.city?.toLowerCase()).toContain("tel aviv");
  });

  it("group : 6 personnes, ce soir", async () => {
    const u = await understandQuestion({ question: byKey.group });
    expect(u.criteria.partySize).toBe(6);
    expect(u.criteria.when?.toLowerCase()).toContain("soir");
    expect(u.tags.join(" ")).toMatch(/6|six/);
  });

  it("rome : Rome, hôtel, romantique, recommandé par mon cercle, sans question", async () => {
    const u = await understandQuestion({ question: byKey.rome });
    expect(u.criteria.city?.toLowerCase()).toBe("rome");
    expect(u.criteria.placeKind?.toLowerCase()).toMatch(/h[ôo]tel/);
    expect(u.tags.join(" ").toLowerCase()).toMatch(/romantique/);
    expect(u.clarification).toBeNull();
  });

  it("cafe : Neve Tzedek, café, calme, pour travailler, sans question", async () => {
    const u = await understandQuestion({ question: byKey.cafe });
    expect((u.criteria.area ?? u.criteria.city ?? "").toLowerCase()).toContain("neve tzedek");
    expect(u.criteria.placeKind?.toLowerCase()).toMatch(/caf/);
    expect(u.tags.join(" ").toLowerCase()).toMatch(/calme/);
    expect(u.clarification).toBeNull();
  });

  it("beach : plage, pas touristique, près de Tel Aviv, sans question", async () => {
    const u = await understandQuestion({ question: byKey.beach });
    expect(u.criteria.placeKind?.toLowerCase()).toContain("plage");
    expect(u.tags.join(" ").toLowerCase()).toMatch(/touristique/);
    expect(u.clarification).toBeNull();
  });

  it("bar : bar, animé, conversation possible", async () => {
    const u = await understandQuestion({ question: byKey.bar });
    expect(u.criteria.placeKind?.toLowerCase()).toContain("bar");
    expect(u.tags.join(" ").toLowerCase()).toMatch(/anim/);
    expect(u.tags.length).toBeGreaterThanOrEqual(2);
  });
});
