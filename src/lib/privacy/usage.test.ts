import { describe, expect, it } from "vitest";
import { DEFAULT_USAGE, USAGE_LABELS, usableForRecommendations } from "./usage";

describe("usableForRecommendations", () => {
  it("tout sert par défaut", () => {
    for (const sourceType of ["email_forward", "qualification", "post_visit_feedback", "manual", "network_reply"] as const) {
      expect(usableForRecommendations({ sourceType, fromMember: sourceType === "network_reply" }, DEFAULT_USAGE)).toBe(true);
    }
  });

  it("« Mes réservations importées » coupe la réservation importée et sa qualification, rien d'autre", () => {
    const prefs = { ...DEFAULT_USAGE, importedBookings: false };
    expect(usableForRecommendations({ sourceType: "email_forward", fromMember: false }, prefs)).toBe(false);
    expect(usableForRecommendations({ sourceType: "qualification", fromMember: false }, prefs)).toBe(false);
    expect(usableForRecommendations({ sourceType: "post_visit_feedback", fromMember: false }, prefs)).toBe(true);
    expect(usableForRecommendations({ sourceType: "manual", fromMember: false }, prefs)).toBe(true);
  });

  it("« Mes retours après visite » coupe les retours du lendemain", () => {
    const prefs = { ...DEFAULT_USAGE, visitFeedback: false };
    expect(usableForRecommendations({ sourceType: "post_visit_feedback", fromMember: false }, prefs)).toBe(false);
    expect(usableForRecommendations({ sourceType: "qualification", fromMember: false }, prefs)).toBe(true);
  });

  it("« Les réponses de mon cercle » coupe tout signal attribué à un proche", () => {
    const prefs = { ...DEFAULT_USAGE, circleReplies: false };
    expect(usableForRecommendations({ sourceType: "network_reply", fromMember: true }, prefs)).toBe(false);
    expect(usableForRecommendations({ sourceType: "email_forward", fromMember: true }, prefs)).toBe(false);
    expect(usableForRecommendations({ sourceType: "manual", fromMember: false }, prefs)).toBe(true);
  });

  it("reprend les libellés de la maquette", () => {
    expect(USAGE_LABELS.map(([, l]) => l)).toEqual([
      "Mes réservations importées",
      "Mes retours après visite",
      "Les réponses de mon cercle (avec leur accord)",
    ]);
  });
});
