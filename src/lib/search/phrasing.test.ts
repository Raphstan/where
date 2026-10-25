import { describe, expect, it } from "vitest";
import { EVIDENCE_LABEL_LONG } from "@/lib/evidence";
import { DAVID, MAYA, ME, NOAM, NOW, SARAH, sig } from "@/test/search-fixtures";
import {
  afterFor,
  DEDUCTION_LABEL,
  deductionLine,
  EVIDENCE_REMINDER,
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

describe("lignes de preuve — phrase libre", () => {
  it("« Sarah le recommande pour un date »", () => {
    expect(signalSentence(sig("recommended", SARAH, { occasion: ["date"] }), NOW, "date")).toBe(
      "Sarah le recommande pour un date",
    );
  });

  it("préfère l'occasion qui correspond à la recherche", () => {
    const s = sig("recommended", MAYA, { occasion: ["amis", "travail"] });
    expect(signalSentence(s, NOW, "travail")).toBe("Maya le recommande pour travailler");
  });

  it("date une recommandation ancienne : « Sarah l’a recommandé en 2023 »", () => {
    expect(signalSentence(sig("recommended", SARAH, { daysAgo: THREE_YEARS }), NOW, null)).toBe(
      "Sarah l’a recommandé en 2023",
    );
  });

  it("une réservation reste une réservation : « David y a réservé en juin », jamais une visite", () => {
    const juin = { ...sig("booked", DAVID), createdAt: new Date("2026-06-14T19:00:00Z") };
    expect(signalSentence(juin, NOW, null)).toBe("David y a réservé en juin");
    expect(signalSentence(juin, NOW, null)).not.toMatch(/visit|allé/i);
  });

  it("cite la note d'un proche entre guillemets français", () => {
    expect(signalSentence(sig("visited", NOAM, { note: "bruyant après 22 h, DJ le jeudi" }), NOW, null)).toBe(
      "Noam : « bruyant après 22 h, DJ le jeudi »",
    );
  });

  it("« Maya l’a enregistré » pour une sauvegarde", () => {
    expect(signalSentence(sig("saved", MAYA), NOW, null)).toBe("Maya l’a enregistré");
  });

  it("parle à l'utilisateur de ses propres signaux, sans les attribuer à un proche", () => {
    expect(signalSentence(sig("recommended", ME), NOW, null)).toBe("Tu le recommandes");
    expect(evidenceLine(sig("visited", ME), NOW, null)?.person).toBeNull();
  });
});

describe("lignes de preuve — libellé long et provenance", () => {
  it("porte le libellé long exact du niveau", () => {
    for (const level of ["recommended", "visited", "booked_confirmed", "booked", "saved"] as const) {
      expect(evidenceLine(sig(level, SARAH), NOW, null)?.label).toBe(EVIDENCE_LABEL_LONG[level]);
    }
  });

  it("emploie les provenances de la maquette", () => {
    expect(provenanceFor("recommended", true)).toBe("de ton cercle");
    expect(provenanceFor("visited", true)).toBe("de ton cercle");
    expect(provenanceFor("recommended", false)).toBe("de tes données");
    expect(provenanceFor("booked", true)).toBe("d’une réservation");
    expect(provenanceFor("booked_confirmed", false)).toBe("d’une réservation");
    expect(provenanceFor("saved", true)).toBe("d’un partage");
    expect(provenanceFor("public", false)).toBe("du web public");
  });

  it("un signal public n'est jamais rattaché à une personne", () => {
    const line = evidenceLine(sig("public", ME, { note: "Informations publiques positives" }), NOW, null);
    expect(line).toMatchObject({ level: "public", label: "Information publique", provenance: "du web public", person: null });
  });

  it("étiquette les déductions « Tes préférences / déduction WHERE », sans personne", () => {
    expect(deductionLine(["caché", "calme"])).toEqual({
      kind: "deduction",
      text: "Correspond à tes critères : caché, calme",
      label: "Tes préférences / déduction WHERE",
      provenance: "de tes données",
      person: null,
    });
    expect(DEDUCTION_LABEL).toBe("Tes préférences / déduction WHERE");
  });

  it("rappelle les cinq niveaux mot pour mot (whyBody)", () => {
    expect(EVIDENCE_REMINDER.map((r) => r.label)).toEqual([
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
    const unknowns = personalUnknowns([sig("recommended", SARAH)], ["terrasse"], "ce soir", NOW);
    expect(unknowns).toEqual([
      "Aucune visite confirmée dans ton cercle",
      "Aucun second avis dans ton cercle",
      "« terrasse » : non confirmé",
      "Disponibilité ce soir non vérifiée",
    ]);
  });

  it("signale l'absence de signal récent", () => {
    expect(personalUnknowns([sig("visited", SARAH, { daysAgo: THREE_YEARS })], [], null, NOW)).toContain(
      "Aucun signal récent dans ton cercle",
    );
  });

  it("annonce l'âge d'une recommandation ancienne en toutes lettres", () => {
    expect(staleNotice([sig("recommended", SARAH, { daysAgo: THREE_YEARS })], NOW)).toBe(
      "Cette recommandation date de trois ans.",
    );
    expect(staleNotice([sig("recommended", SARAH)], NOW)).toBeNull();
    expect(numberWord(3)).toBe("trois");
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
    links: { googleMapsUrl: null },
  });

  it("« J’ai trois idées solides pour toi. » avec le meilleur match en gras", () => {
    const results = [
      card("Beit Kandinof", "personal", "Sarah le recommande pour un date"),
      card("Herzl 16", "personal", "Maya l’a enregistré"),
      card("C’est Quelque Chose", "discovery", "Aucun proche ne l’a encore recommandé"),
    ];
    expect(introFor(results)).toEqual([
      { text: "J’ai trois idées solides pour toi. " },
      { text: "Beit Kandinof", strong: true },
      { text: " semble être le meilleur match : Sarah le recommande pour un date." },
    ]);
    expect(afterFor(results)).toBe(
      "Le troisième est une découverte : personne de ton cercle ne l’a encore validé, je te le montre pour l’exploration.",
    );
  });

  it("« Une réponse nette plutôt que trois. » pour un seul résultat", () => {
    expect(introFor([card("Hotel de’ Ricci", "personal", "Sarah le recommande")])[0]).toEqual({
      text: "Une réponse nette plutôt que trois. ",
    });
  });

  it("avoue l'absence de signaux fiables quand seule une découverte reste", () => {
    const results = [card("Plage de Sdot Yam", "discovery", "x")];
    expect(introFor(results)).toEqual([
      { text: "Je n’ai pas encore assez de signaux fiables dans ton cercle pour te donner une réponse avec confiance." },
    ]);
    expect(afterFor(results)).toBe("Une découverte publique — sans aucun signal de ton cercle, donc à prendre comme une piste.");
  });
});
