import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/translator";
import {
  BOOKED_ANSWERS,
  bookedAnswerLevel,
  bookedQuestion,
  bookedReply,
  feedbackLevel,
  FeedbackSchema,
  followUpDueAt,
  bookedAnswerLabel,
  NOT_VISITED,
  ratingLabel,
  RATINGS,
} from "./followup";

const t = translator("fr", "booking");

describe("« As-tu réservé ? »", () => {
  it("pose la question de la maquette", () => {
    expect(bookedQuestion(t, "Beit Kandinof")).toBe("De retour. As-tu réservé chez Beit Kandinof ?");
  });

  it("« Oui » → booked, jamais visited ; les autres réponses ne créent rien", () => {
    expect(BOOKED_ANSWERS.map((a) => bookedAnswerLabel(t, a))).toEqual(["Oui", "Pas encore", "J’ai choisi un autre endroit"]);
    expect(bookedAnswerLevel("yes")).toBe("booked");
    expect(bookedAnswerLevel("notYet")).toBeNull();
    expect(bookedAnswerLevel("otherPlace")).toBeNull();
    for (const a of BOOKED_ANSWERS) expect(bookedAnswerLevel(a)).not.toBe("visited");
  });

  it("répond « réservé — pas encore comme visité »", () => {
    const parts = bookedReply(t, "yes", "Beit Kandinof");
    expect(parts.find((p) => p.strong)?.text).toBe("Beit Kandinof");
    const text = parts.map((p) => p.text).join("");
    expect(text).toBe(
      "Parfait. Je garde Beit Kandinof dans ta mémoire comme réservé, pas encore comme visité. Je te demanderai demain comment c’était.",
    );
  });
});

describe("retour après visite → niveau de preuve", () => {
  it("affiche les réponses de la maquette", () => {
    expect(RATINGS.map((r) => ratingLabel(t, r))).toEqual(["Excellent", "Bien", "Moyen", "Pas pour moi", "Je n’y suis finalement pas allé"]);
  });

  it("« Je n’y suis finalement pas allé » → aucune visite", () => {
    expect(feedbackLevel({ rating: NOT_VISITED, recommend: null })).toBeNull();
  });

  it("visité + « Absolument » → recommended", () => {
    expect(feedbackLevel({ rating: "Excellent", recommend: "Absolument" })).toBe("recommended");
  });

  it("visité sans recommandation franche → visited", () => {
    expect(feedbackLevel({ rating: "Bien", recommend: "Dans certains contextes" })).toBe("visited");
    expect(feedbackLevel({ rating: "Pas pour moi", recommend: "Pas vraiment" })).toBe("visited");
  });

  it("refuse une recommandation sans visite, et une visite sans réponse à la recommandation", () => {
    expect(FeedbackSchema.safeParse({ rating: NOT_VISITED, recommend: "Absolument", occasion: [] }).success).toBe(false);
    expect(FeedbackSchema.safeParse({ rating: "Bien", recommend: null, occasion: [] }).success).toBe(false);
    expect(FeedbackSchema.safeParse({ rating: "Bien", recommend: "Pas vraiment", occasion: ["date"] }).success).toBe(true);
    expect(FeedbackSchema.safeParse({ rating: NOT_VISITED, recommend: null, occasion: [] }).success).toBe(true);
  });

  it("n'accepte que les réponses de la maquette", () => {
    expect(FeedbackSchema.safeParse({ rating: "Génial", recommend: "Absolument", occasion: [] }).success).toBe(false);
    expect(FeedbackSchema.safeParse({ rating: "Bien", recommend: "Absolument", occasion: ["anniversaire"] }).success).toBe(false);
  });
});

describe("échéance du retour", () => {
  it("le lendemain à 8 h, heure d'Israël (été : UTC+3)", () => {
    expect(followUpDueAt(new Date("2026-07-14T17:30:00Z")).toISOString()).toBe("2026-07-15T05:00:00.000Z");
  });

  it("le lendemain à 8 h, heure d'Israël (hiver : UTC+2)", () => {
    expect(followUpDueAt(new Date("2026-12-01T19:00:00Z")).toISOString()).toBe("2026-12-02T06:00:00.000Z");
  });

  it("une réservation à 23 h 30 heure locale compte pour le jour local", () => {
    // 2026-12-01 23:30 à Tel Aviv = 21:30 UTC → retour le 2 au matin.
    expect(followUpDueAt(new Date("2026-12-01T21:30:00Z")).toISOString()).toBe("2026-12-02T06:00:00.000Z");
    // 2026-12-02 00:30 à Tel Aviv = 2026-12-01 22:30 UTC → retour le 3 au matin.
    expect(followUpDueAt(new Date("2026-12-01T22:30:00Z")).toISOString()).toBe("2026-12-03T06:00:00.000Z");
  });
});
