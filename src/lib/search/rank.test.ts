import { describe, expect, it } from "vitest";
import { CIRCLE, DAVID, MAYA, ME, NOAM, NOW, SARAH, criteria, place, rows, sig } from "@/test/search-fixtures";
import { inCircle, MAX_RESULTS, rankMemory, signalWeight } from "./rank";
import type { SignalAuthor } from "./signal";

const STRANGER: SignalAuthor = { kind: "member", id: "stranger", name: "Inconnu", trustDomains: [] };

describe("filtrage par cercle", () => {
  it("écarte un signal attribué à quelqu'un hors du cercle", () => {
    const kept = inCircle(rows(place("p1"), [sig("recommended", STRANGER), sig("visited", SARAH)]), CIRCLE);
    expect(kept.map((r) => r.signal.author)).toEqual([SARAH]);
  });

  it("garde les signaux de l'utilisateur lui-même", () => {
    expect(inCircle(rows(place("p1"), [sig("visited", ME)]), CIRCLE)).toHaveLength(1);
  });

  it("écarte un signal dont la réutilisation a été refusée", () => {
    expect(inCircle(rows(place("p1"), [sig("recommended", SARAH)], false), CIRCLE)).toHaveLength(0);
  });

  it("une réponse non réutilisable ne sert qu'à la conversation où elle a été donnée", () => {
    const memory = rows(place("p1"), [sig("recommended", SARAH)], false).map((r) => ({ ...r, conversationId: "c1" }));
    expect(inCircle(memory, CIRCLE, "c1")).toHaveLength(1);
    expect(inCircle(memory, CIRCLE, "c2")).toHaveLength(0);
    expect(inCircle(memory, CIRCLE)).toHaveLength(0);
  });

  it("un lieu porté uniquement par un étranger au cercle n'apparaît jamais", () => {
    const results = rankMemory(rows(place("secret"), [sig("recommended", STRANGER)]), CIRCLE, criteria(), NOW);
    expect(results).toEqual([]);
  });

  it("aucun nom hors du cercle n'apparaît dans les preuves", () => {
    const memory = rows(place("p1"), [sig("recommended", SARAH), sig("recommended", STRANGER)]);
    const [result] = rankMemory(memory, CIRCLE, criteria(), NOW);
    expect(JSON.stringify(result)).not.toContain("Inconnu");
    expect(result!.people.map((p) => p.name)).toEqual(["Sarah"]);
  });
});

describe("rankMemory", () => {
  const kandinof = place("Beit Kandinof", { kind: "Restaurant & galerie", vibe: ["intime", "caché"] });
  const herzl = place("Herzl 16", { kind: "Bar-restaurant" });
  const dallal = place("Dallal Bakery", { kind: "Boulangerie-café" });
  const nahat = place("Café Nahat", { kind: "Café" });

  const memory = [
    ...rows(herzl, [sig("saved", MAYA), sig("booked", DAVID), sig("saved", NOAM)]),
    ...rows(kandinof, [sig("recommended", SARAH, { occasion: ["date"] }), sig("visited", NOAM)]),
    ...rows(dallal, [sig("recommended", SARAH, { daysAgo: 3 * 365 + 1 })]),
    ...rows(nahat, [sig("recommended", MAYA), sig("visited", MAYA)]),
  ];

  it("classe la confiance forte avant la moyenne, et coupe à trois résultats", () => {
    const results = rankMemory(memory, CIRCLE, criteria(), NOW);
    expect(results).toHaveLength(MAX_RESULTS);
    expect(results.map((r) => r.confidence.level)).toEqual(["forte", "forte", "moyenne"]);
  });

  it("donne les rangs de la maquette et la phrase principale au premier", () => {
    const results = rankMemory(memory, CIRCLE, criteria(), NOW);
    expect(results.map((r) => r.rank)).toEqual(["Meilleur match", "n°2", "n°3"]);
    expect(results[0]!.headline).toBe("Le meilleur match pour ta demande");
    expect(results[1]!.headline).toBeNull();
  });

  it("favorise l'occasion et l'ambiance demandées", () => {
    const results = rankMemory(memory, CIRCLE, criteria({ occasion: "date", vibe: ["caché"] }), NOW);
    expect(results[0]!.name).toBe("Beit Kandinof");
    expect(results[0]!.lines.at(-1)).toMatchObject({ kind: "deduction", text: "Correspond à tes critères : caché" });
  });

  it("écarte un lieu dont le type contredit la demande, garde ceux dont le type est inconnu", () => {
    const unknownKind = place("Sans type", { kind: null });
    const results = rankMemory(
      [...memory, ...rows(unknownKind, [sig("recommended", SARAH)])],
      CIRCLE,
      criteria({ placeKind: "café" }),
      NOW,
      10,
    );
    expect(results.map((r) => r.name).sort()).toEqual(["Café Nahat", "Dallal Bakery", "Sans type"]);
  });

  it("écarte un lieu d'une autre ville", () => {
    const rome = place("Hotel de’ Ricci", { city: "Rome", kind: "Hôtel boutique" });
    const results = rankMemory(rows(rome, [sig("recommended", SARAH)]), CIRCLE, criteria({ city: "Tel Aviv" }), NOW);
    expect(results).toEqual([]);
  });

  it("ignore un lieu sans aucun signal personnel", () => {
    const pub = place("Public", {});
    expect(rankMemory(rows(pub, [sig("public", ME, { note: "x" })]), CIRCLE, criteria(), NOW)).toEqual([]);
  });

  it("affiche la notice d'ancienneté pour une recommandation de trois ans", () => {
    const [result] = rankMemory(rows(dallal, [sig("recommended", SARAH, { daysAgo: 3 * 365 + 1 })]), CIRCLE, criteria(), NOW);
    expect(result!.staleNotice).toBe("Cette recommandation date de trois ans.");
  });
});

describe("signalWeight", () => {
  it("pèse moins un proche hors de ses domaines de confiance", () => {
    const bars = new Set(["nightlife"]);
    expect(signalWeight(sig("recommended", NOAM), bars, NOW)).toBeGreaterThan(signalWeight(sig("recommended", DAVID), bars, NOW));
  });

  it("« Je lui fais confiance pour tout » couvre tous les domaines", () => {
    const all: SignalAuthor = { kind: "member", id: "x", name: "X", trustDomains: ["all"] };
    expect(signalWeight(sig("recommended", all), new Set(["hotels"]), NOW)).toBe(5);
  });

  it("une réservation pèse moins qu'une visite confirmée", () => {
    expect(signalWeight(sig("booked", SARAH), new Set(), NOW)).toBeLessThan(signalWeight(sig("visited", SARAH), new Set(), NOW));
  });
});
