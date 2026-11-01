import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/translator";
import { Constants } from "@/lib/supabase/database.types";
import {
  evidenceLabelLong,
  EVIDENCE_LEVELS,
  evidenceRank,
  isEvidenceLevel,
  memoryLabel,
  sortByStrength,
} from "./evidence";

const t = translator("fr", "evidence");
const PERSONAL = ["recommended", "visited", "booked_confirmed", "booked", "saved"] as const;

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
    expect(Object.fromEntries(EVIDENCE_LEVELS.map((l) => [l, evidenceLabelLong(t, l)]))).toEqual({
      recommended: "Recommandé explicitement",
      visited: "Visité et confirmé",
      booked_confirmed: "Réservation confirmée",
      booked: "Réservation confirmée / signal post-visite",
      saved: "Sauvegardé ou partagé",
      public: "Information publique",
    });
  });

  it("ont les libellés courts de la maquette, sans le niveau public", () => {
    expect(Object.fromEntries(PERSONAL.map((l) => [l, t(`short.${l}`)]))).toEqual({
      recommended: "Recommandé",
      visited: "Visité",
      booked_confirmed: "Réservé",
      booked: "Réservé",
      saved: "Sauvegardé",
    });
    expect(() => memoryLabel(t, "public")).toThrow();
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
    expect(memoryLabel(t, "recommended", "Sarah")).toBe("Recommandé par Sarah");
    expect(memoryLabel(t, "saved", "Maya")).toBe("Sauvegardé par Maya");
  });

  it("n'ajoute rien quand le signal vient de l'utilisateur", () => {
    expect(memoryLabel(t, "visited")).toBe("Visité");
    expect(memoryLabel(t, "booked", null)).toBe("Réservé");
  });

  it("refuse le niveau public : jamais attribué, jamais dans la mémoire", () => {
    expect(() => memoryLabel(t, "public", "Sarah")).toThrow();
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
