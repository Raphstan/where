import { describe, expect, it } from "vitest";
import { Constants } from "@/lib/supabase/database.types";
import {
  EVIDENCE_LABEL_LONG,
  EVIDENCE_LABEL_SHORT,
  EVIDENCE_LEVELS,
  evidenceRank,
  isEvidenceLevel,
  memoryLabel,
  sortByStrength,
} from "./evidence";

describe("niveaux de preuve", () => {
  it("sont exactement ceux de l'enum Postgres, dans le même ordre", () => {
    expect([...EVIDENCE_LEVELS]).toEqual([...Constants.public.Enums.evidence_level]);
  });

  it("vont du plus fort au plus faible", () => {
    expect([...EVIDENCE_LEVELS]).toEqual([
      "recommended",
      "visited",
      "booked_confirmed",
      "booked",
      "saved",
      "public",
    ]);
    expect(evidenceRank("recommended")).toBeLessThan(evidenceRank("public"));
  });

  it("ont les libellés longs de la maquette, mot pour mot", () => {
    expect(EVIDENCE_LABEL_LONG).toEqual({
      recommended: "Recommandé explicitement",
      visited: "Visité et confirmé",
      booked_confirmed: "Réservation confirmée",
      booked: "Réservation confirmée / signal post-visite",
      saved: "Sauvegardé ou partagé",
      public: "Information publique",
    });
  });

  it("ont les libellés courts de la maquette, sans le niveau public", () => {
    expect(EVIDENCE_LABEL_SHORT).toEqual({
      recommended: "Recommandé",
      visited: "Visité",
      booked_confirmed: "Réservé",
      booked: "Réservé",
      saved: "Sauvegardé",
    });
    expect("public" in EVIDENCE_LABEL_SHORT).toBe(false);
  });

  it("rejettent toute valeur hors énumération", () => {
    expect(isEvidenceLevel("recommended")).toBe(true);
    expect(isEvidenceLevel("liked")).toBe(false);
    expect(isEvidenceLevel("")).toBe(false);
    expect(isEvidenceLevel(null)).toBe(false);
  });
});

describe("memoryLabel", () => {
  it("ajoute « par {Prénom} » quand le signal vient d'un proche", () => {
    expect(memoryLabel("recommended", "Sarah")).toBe("Recommandé par Sarah");
    expect(memoryLabel("saved", "Maya")).toBe("Sauvegardé par Maya");
  });

  it("n'ajoute rien quand le signal vient de l'utilisateur", () => {
    expect(memoryLabel("visited")).toBe("Visité");
    expect(memoryLabel("booked", null)).toBe("Réservé");
  });

  it("refuse le niveau public : jamais attribué, jamais dans la mémoire", () => {
    expect(() => memoryLabel("public", "Sarah")).toThrow();
  });
});

describe("sortByStrength", () => {
  it("classe les signaux du plus fort au plus faible", () => {
    const sorted = sortByStrength([
      { id: 1, evidence_level: "saved" as const },
      { id: 2, evidence_level: "recommended" as const },
      { id: 3, evidence_level: "booked" as const },
    ]);
    expect(sorted.map((s) => s.id)).toEqual([2, 3, 1]);
  });
});
