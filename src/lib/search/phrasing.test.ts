import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/translator";
import { evidenceLabelLong } from "@/lib/evidence";
import { DAVID, MAYA, ME, NOAM, NOW, SARAH, sig } from "@/test/search-fixtures";
import {
  afterFor,
  askIntroFor,
  deductionLabel,
  deductionLine,
  evidenceReminder,
  evidenceLine,
  introFor,
  numberWord,
  personalUnknowns,
  provenanceFor,
  signalSentence,
  staleNotice,
} from "./phrasing";
import type { SearchResult } from "./types";

const THREE_YEARS = 3 * 365 + 1;
const t = translator("fr", "search");
const tr = { t, ev: translator("fr", "evidence") };

describe("lignes de preuve — phrase libre", () => {
  it("« Sarah le recommande pour un date »", () => {
    expect(signalSentence(t, sig("recommended", SARAH, { occasion: ["date"] }), NOW, "date")).toBe(
      "Sarah le recommande pour un date",
    );
  });

  it("préfère l'occasion qui correspond à la recherche", () => {
    const s = sig("recommended", MAYA, { occasion: ["amis", "travail"] });
    expect(signalSentence(t, s, NOW, "travail")).toBe("Maya le recommande pour travailler");
  });

  it("date une recommandation ancienne : « Sarah l’a recommandé en 2023 »", () => {
    expect(signalSentence(t, sig("recommended", SARAH, { daysAgo: THREE_YEARS }), NOW, null)).toBe(
      "Sarah l’a recommandé en 2023",
    );
  });

  it("une réservation reste une réservation : « David y a réservé en juin », jamais une visite", () => {
    const juin = { ...sig("booked", DAVID), createdAt: new Date("2026-06-14T19:00:00Z") };
    expect(signalSentence(t, juin, NOW, null)).toBe("David y a réservé en juin");
    expect(signalSentence(t, juin, NOW, null)).not.toMatch(/visit|allé/i);
  });

  it("cite la note d'un proche entre guillemets français", () => {
    expect(signalSentence(t, sig("visited", NOAM, { note: "bruyant après 22 h, DJ le jeudi" }), NOW, null)).toBe(
      "Noam : « bruyant après 22 h, DJ le jeudi »",
    );
  });

  it("« Maya l’a enregistré » pour une sauvegarde", () => {
    expect(signalSentence(t, sig("saved", MAYA), NOW, null)).toBe("Maya l’a enregistré");
  });

  it("parle à l'utilisateur de ses propres signaux, sans les attribuer à un proche", () => {
    expect(signalSentence(t, sig("recommended", ME), NOW, null)).toBe("Tu le recommandes");
    expect(evidenceLine(tr, sig("visited", ME), NOW, null)?.person).toBeNull();
  });
});

describe("lignes de preuve — libellé long et provenance", () => {
  it("porte le libellé long exact du niveau", () => {
    for (const level of ["recommended", "visited", "booked_confirmed", "booked", "saved"] as const) {
      expect(evidenceLine(tr, sig(level, SARAH), NOW, null)?.label).toBe(evidenceLabelLong(translator("fr", "evidence"), level));
    }
  });

  it("emploie les provenances de la maquette", () => {
    expect(provenanceFor(t, "recommended", true)).toBe("de ton cercle");
    expect(provenanceFor(t, "visited", true)).toBe("de ton cercle");
    expect(provenanceFor(t, "recommended", false)).toBe("de tes données");
    expect(provenanceFor(t, "booked", true)).toBe("d’une réservation");
    expect(provenanceFor(t, "booked_confirmed", false)).toBe("d’une réservation");
    expect(provenanceFor(t, "saved", true)).toBe("d’un partage");
    expect(provenanceFor(t, "public", false)).toBe("du web public");
  });

  it("un signal public n'est jamais rattaché à une personne", () => {
    const line = evidenceLine(tr, sig("public", ME, { note: "Informations publiques positives" }), NOW, null);
    expect(line).toMatchObject({ level: "public", label: "Information publique", provenance: "du web public", person: null });
  });

  it("étiquette les déductions « Tes préférences / déduction WH3RE », sans personne", () => {
    expect(deductionLine(t, ["caché", "calme"])).toEqual({
      kind: "deduction",
      text: "Correspond à tes critères : caché, calme",
      label: "Tes préférences / déduction WH3RE",
      provenance: "de tes données",
      person: null,
    });
    expect(deductionLabel(t)).toBe("Tes préférences / déduction WH3RE");
  });

  it("rappelle les cinq niveaux mot pour mot (whyBody)", () => {
    expect(evidenceReminder(tr).map((r) => r.label)).toEqual([
      "Recommandé explicitement",
      "Visité et confirmé",
      "Réservation confirmée / signal post-visite",
      "Sauvegardé ou partagé",
      "Information publique uniquement",
    ]);
  });
});

describe("ce que nous ne savons pas encore", () => {
  it("dit ce qui manque réellement aux preuves", () => {
    const unknowns = personalUnknowns(t, [sig("recommended", SARAH)], ["terrasse"], "ce soir", NOW);
    expect(unknowns).toEqual([
      "Aucune visite confirmée dans ton cercle",
      "Aucun second avis dans ton cercle",
      "« terrasse » : non confirmé",
      "Disponibilité ce soir non vérifiée",
    ]);
  });

  it("signale l'absence de signal récent", () => {
    expect(personalUnknowns(t, [sig("visited", SARAH, { daysAgo: THREE_YEARS })], [], null, NOW)).toContain(
      "Aucun signal récent dans ton cercle",
    );
  });

  it("annonce l'âge d'une recommandation ancienne en toutes lettres", () => {
    expect(staleNotice(t, [sig("recommended", SARAH, { daysAgo: THREE_YEARS })], NOW)).toBe(
      "Cette recommandation date de trois ans.",
    );
    expect(staleNotice(t, [sig("recommended", SARAH)], NOW)).toBeNull();
    expect(numberWord(t, 3)).toBe("trois");
  });
});

describe("intro et notice", () => {
  const card = (name: string, origin: SearchResult["origin"], text: string): SearchResult => ({
    id: name,
    origin,
    rank: "",
    name,
    area: null,
    kind: null,
    vibe: [],
    noise: null,
    price: null,
    headline: null,
    lines: [{ kind: "evidence", level: "recommended", text, label: "", provenance: "", person: null }],
    unknowns: [],
    confidence: { level: "forte", text: "" },
    people: [],
    staleNotice: null,
    conflictNotice: null,
    links: { googleMapsUrl: null },
    booking: [],
  });

  it("« J’ai trois idées solides pour toi. » avec le meilleur match en gras", () => {
    const results = [
      card("Beit Kandinof", "personal", "Sarah le recommande pour un date"),
      card("Herzl 16", "personal", "Maya l’a enregistré"),
      card("C’est Quelque Chose", "discovery", "Aucun proche ne l’a encore recommandé"),
    ];
    expect(introFor(t, results)).toEqual([
      { text: "J’ai trois idées solides pour toi. " },
      { text: "Beit Kandinof", strong: true },
      { text: " semble être le meilleur match : Sarah le recommande pour un date." },
    ]);
    expect(afterFor(t, results)).toBe(
      "Le troisième est une découverte : personne de ton cercle ne l’a encore validé, je te le montre pour l’exploration.",
    );
  });

  it("« Une réponse nette plutôt que trois. » pour un seul résultat", () => {
    expect(introFor(t, [card("Hotel de’ Ricci", "personal", "Sarah le recommande")])[0]).toEqual({
      text: "Une réponse nette plutôt que trois. ",
    });
  });

  it("appelle le réseau quand la confiance est insuffisante (maquette, scénario zikhron)", () => {
    const people = [
      { name: "David", relevant: true },
      { name: "Sarah", relevant: true },
      { name: "Maya", relevant: true },
      { name: "Noam", relevant: false },
    ];
    expect(askIntroFor(t, [], people)).toEqual([
      { text: "Je n’ai pas encore assez de signaux fiables dans ton cercle pour te donner une réponse avec confiance. Mais " },
      { text: "trois personnes", strong: true },
      { text: " pourraient probablement t’aider." },
    ]);
    expect(askIntroFor(t, [], [{ name: "Sarah", relevant: true }])?.slice(1)).toEqual([
      { text: "Sarah", strong: true },
      { text: " pourrait probablement t’aider." },
    ]);
  });

  it("ne prétend pas qu'une recommandation manque quand deux proches se contredisent", () => {
    const split = {
      ...card("Spicehaus", "personal", "x"),
      confidence: { level: "moyenne" as const, text: "Moyenne : signaux contradictoires" },
      conflictNotice: "Signaux contradictoires : …",
    };
    expect(askIntroFor(t, [split], [{ name: "Noam", relevant: true }])?.[0]).toEqual({
      text: "Les avis de ton cercle divergent sur ce lieu. Mais ",
    });
  });

  it("n'appelle pas le réseau quand un résultat est sûr, ni sans proche pertinent", () => {
    const sure = { ...card("Beit Kandinof", "personal", "x"), confidence: { level: "forte" as const, text: "" } };
    expect(askIntroFor(t, [sure], [{ name: "Sarah", relevant: true }])).toBeNull();
    expect(askIntroFor(t, [], [{ name: "Noam", relevant: false }])).toBeNull();
  });

  it("avoue l'absence de signaux fiables quand seule une découverte reste", () => {
    const results = [card("Plage de Sdot Yam", "discovery", "x")];
    expect(introFor(t, results)).toEqual([
      { text: "Je n’ai pas encore assez de signaux fiables dans ton cercle pour te donner une réponse avec confiance." },
    ]);
    expect(afterFor(t, results)).toBe("Une découverte publique, sans aucun signal de ton cercle : à prendre comme une piste.");
  });
});
