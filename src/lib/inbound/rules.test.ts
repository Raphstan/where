import { describe, expect, it } from "vitest";
import { EVIDENCE_LABEL_LONG, memoryLabel } from "@/lib/evidence";
import {
  canCountAsVisit,
  EMAIL_KINDS,
  formatDay,
  initialStatus,
  provenanceLabel,
  qualificationLevels,
  qualificationSummary,
  QualificationSchema,
  summarizeImport,
  type ImportedEmail,
} from "./rules";

describe("réception : annulation ou livraison ≠ visite", () => {
  it("une réservation attend la qualification ; le reste est écarté", () => {
    expect(initialStatus("table")).toBe("pending");
    expect(initialStatus("hotel")).toBe("pending");
    expect(initialStatus("activity")).toBe("pending");
    expect(initialStatus("delivery")).toBe("excluded");
    expect(initialStatus("cancellation")).toBe("excluded");
    expect(initialStatus("other")).toBe("excluded");
  });

  it("une livraison ou une annulation ne crée aucun signal, même avec « Oui » et « Absolument »", () => {
    for (const kind of ["delivery", "cancellation", "other"] as const) {
      expect(canCountAsVisit(kind)).toBe(false);
      expect(qualificationLevels(kind, { visited: "Oui", recommend: "Absolument" })).toEqual([]);
    }
  });

  it("couvre chaque classification", () => {
    expect(EMAIL_KINDS).toEqual(["table", "hotel", "activity", "delivery", "cancellation", "other"]);
  });
});

describe("qualification → niveaux de preuve", () => {
  it("visité + « Absolument » → booked + recommended", () => {
    expect(qualificationLevels("table", { visited: "Oui", recommend: "Absolument" })).toEqual(["booked", "recommended"]);
  });

  it("visité, sans « Absolument » → booked + visited", () => {
    for (const recommend of ["Oui, dans certains contextes", "Pas vraiment", "Non"] as const) {
      expect(qualificationLevels("hotel", { visited: "Oui", recommend })).toEqual(["booked", "visited"]);
    }
  });

  it("« Je ne sais plus » → reste booked, jamais visited", () => {
    expect(qualificationLevels("table", { visited: "Je ne sais plus", recommend: null })).toEqual(["booked"]);
  });

  it("« Non » → ignoré, aucun signal", () => {
    expect(qualificationLevels("activity", { visited: "Non", recommend: null })).toEqual([]);
  });

  it("libellés exacts des niveaux créés", () => {
    expect(EVIDENCE_LABEL_LONG.booked).toBe("Réservation confirmée / signal post-visite");
    expect(memoryLabel("booked")).toBe("Réservé");
    expect(memoryLabel("visited")).toBe("Visité");
    expect(memoryLabel("recommended")).toBe("Recommandé");
  });
});

describe("QualificationSchema", () => {
  const base = { action: "qualify", occasion: [], note: null } as const;

  it("accepte les réponses de la maquette", () => {
    expect(QualificationSchema.safeParse({ action: "skip" }).success).toBe(true);
    expect(QualificationSchema.safeParse({ ...base, visited: "Oui", recommend: "Absolument", occasion: ["date"], note: "Calme avant 22 h" }).success).toBe(true);
    expect(QualificationSchema.safeParse({ ...base, visited: "Je ne sais plus", recommend: null }).success).toBe(true);
  });

  it("refuse une recommandation sans visite, une visite sans réponse, une occasion après « Pas vraiment »", () => {
    expect(QualificationSchema.safeParse({ ...base, visited: "Non", recommend: "Absolument" }).success).toBe(false);
    expect(QualificationSchema.safeParse({ ...base, visited: "Oui", recommend: null }).success).toBe(false);
    expect(QualificationSchema.safeParse({ ...base, visited: "Oui", recommend: "Pas vraiment", occasion: ["date"] }).success).toBe(false);
    expect(QualificationSchema.safeParse({ ...base, visited: "Oui", recommend: "Absolument", occasion: ["anniversaire"] }).success).toBe(false);
  });
});

describe("résumé de fin de pile (maquette)", () => {
  it("reprend les textes de la maquette", () => {
    expect(qualificationSummary({ visited: "Oui", recommend: "Absolument", occasion: ["date", "amis"] })).toEqual({
      text: "Visité · tu le recommandes · date, amis",
      level: "recommended",
    });
    expect(qualificationSummary({ visited: "Oui", recommend: "Oui, dans certains contextes", occasion: [] })).toEqual({
      text: "Visité · oui, dans certains contextes",
      level: "visited",
    });
    expect(qualificationSummary({ visited: "Non", recommend: null, occasion: [] })).toEqual({ text: "Réservé, non visité — ignoré", level: "public" });
    expect(qualificationSummary({ visited: "Je ne sais plus", recommend: null, occasion: [] })).toEqual({
      text: "Réservé, présence incertaine",
      level: "booked",
    });
    expect(qualificationSummary(null)).toEqual({ text: "Ignoré", level: "booked" });
  });
});

describe("résultats de l'import", () => {
  const e = (id: string, kind: ImportedEmail["kind"], status: ImportedEmail["status"], platform: string | null): ImportedEmail => ({
    id,
    kind,
    status,
    platform,
    placeName: id,
    city: null,
    reservedFor: null,
  });

  it("compte restaurants, hôtels, activités ; écarte et compte livraisons et annulations", () => {
    const s = summarizeImport([
      e("Fantastic", "table", "pending", "Tabit"),
      e("MILA", "table", "cancelled", "Tabit"),
      e("The Norman", "hotel", "qualified", "Booking"),
      e("Barby", "activity", "skipped", null),
      e("Pizza Lola", "delivery", "excluded", "Tabit"),
      e("Miznon", "delivery", "excluded", "Tabit"),
      e("MILA-annulée", "cancellation", "excluded", "Tabit"),
      e("Promo", "other", "excluded", "Wolt"),
    ]);
    expect(s.restaurants.map((x) => x.id)).toEqual(["Fantastic"]);
    expect(s.hotels).toHaveLength(1);
    expect(s.activities).toHaveLength(1);
    expect(s.deliveries).toHaveLength(2);
    expect(s.cancellations).toHaveLength(1);
    expect(s.pending).toBe(1);
    expect(s.noOntopo).toBe(true);
    expect(s.deliveriesAllTabit).toBe(true);
  });

  it("formate les dates et la provenance comme la maquette", () => {
    expect(formatDay("2026-09-12", true)).toBe("12 sept. 2026");
    expect(formatDay("2026-09-12", false)).toBe("12 sept.");
    expect(formatDay(null, true)).toBeNull();
    expect(provenanceLabel("table", "Tabit")).toBe("Réservation Tabit");
    expect(provenanceLabel("hotel", "Booking")).toBe("Confirmation hôtel");
    expect(provenanceLabel("activity", null)).toBe("Activité");
  });
});
