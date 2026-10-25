import { describe, expect, it } from "vitest";
import { CONFIDENCE_TEXT, computeConfidence, discoveryConfidence } from "./confidence";
import { DAVID, MAYA, ME, NOAM, NOW, SARAH, sig } from "@/test/search-fixtures";

const THREE_YEARS = 3 * 365 + 1;

describe("computeConfidence — niveaux", () => {
  it("forte dès qu'une recommandation explicite récente existe", () => {
    expect(computeConfidence([sig("recommended", SARAH)], NOW).level).toBe("forte");
  });

  it("moyenne sans aucune recommandation, même avec réservation et sauvegarde (Herzl 16)", () => {
    const c = computeConfidence([sig("saved", MAYA), sig("booked", DAVID)], NOW);
    expect(c).toEqual({ level: "moyenne", text: "Moyenne — une recommandation personnelle manque" });
  });

  it("moyenne quand la seule recommandation est ancienne (Dallal Bakery)", () => {
    const c = computeConfidence([sig("recommended", SARAH, { daysAgo: THREE_YEARS })], NOW);
    expect(c).toEqual({ level: "moyenne", text: "Moyenne — recommandation ancienne" });
  });

  it("moyenne pour une visite seule (Port Sa’id)", () => {
    expect(computeConfidence([sig("visited", NOAM)], NOW).level).toBe("moyenne");
  });

  it("exploratoire sans signal personnel", () => {
    expect(computeConfidence([sig("public", ME, { note: "Ambiance musicale" })], NOW)).toEqual({
      level: "explo",
      text: "Exploratoire — principalement basé sur des données publiques",
    });
    expect(computeConfidence([], NOW)).toEqual({
      level: "explo",
      text: "Exploratoire — informations publiques uniquement",
    });
  });

  it("une découverte Google Places est exploratoire, informations publiques uniquement", () => {
    expect(discoveryConfidence()).toEqual({ level: "explo", text: "Exploratoire — informations publiques uniquement" });
  });

  it("une réservation ne remplace jamais une visite : réco + réservation n'est pas « visite confirmée »", () => {
    const c = computeConfidence([sig("recommended", SARAH), sig("booked", SARAH)], NOW);
    expect(c.level).toBe("forte");
    expect(c.text).not.toBe(CONFIDENCE_TEXT.forteRecoAndVisit);
  });
});

describe("computeConfidence — textes de la maquette", () => {
  it("« recommandation explicite et visite confirmée » quand la même personne recommande et y est allée (Tishbi)", () => {
    const c = computeConfidence([sig("recommended", SARAH), sig("visited", SARAH)], NOW);
    expect(c.text).toBe("Forte — recommandation explicite et visite confirmée");
  });

  it("« basée sur 3 signaux personnels » (Beit Kandinof)", () => {
    const c = computeConfidence([sig("recommended", SARAH), sig("visited", NOAM), sig("visited", MAYA)], NOW);
    expect(c.text).toBe("Forte — basée sur 3 signaux personnels");
  });

  it("« 2 recommandations » quand deux proches recommandent", () => {
    const c = computeConfidence([sig("recommended", SARAH), sig("recommended", NOAM)], NOW);
    expect(c.text).toBe("Forte — 2 recommandations");
  });

  it("« recommandation récente de Maya » pour une seule recommandation d'un proche", () => {
    expect(computeConfidence([sig("recommended", MAYA)], NOW).text).toBe("Forte — recommandation récente de Maya");
  });

  it("ne compte pas deux fois le même couple (personne, niveau)", () => {
    const c = computeConfidence(
      [sig("recommended", SARAH), sig("booked", DAVID), sig("booked", DAVID, { daysAgo: 40 })],
      NOW,
    );
    expect(c.text).toBe("Forte — recommandation récente de Sarah");
  });

  it("accorde « signal » au singulier pour une recommandation de l'utilisateur seul", () => {
    expect(computeConfidence([sig("recommended", ME)], NOW).text).toBe("Forte — basée sur 1 signal personnel");
  });
});
