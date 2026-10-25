import { describe, expect, it } from "vitest";
import { criteria } from "@/test/search-fixtures";
import { askedText, draftMessage, joinNames, replyLink, waMeUrl, whatsappText } from "./message";

describe("message pré-rédigé", () => {
  it("parle à la troisième personne quand le prénom est connu, sur le modèle de la maquette", () => {
    const c = criteria({ city: "Zikhron Ya’akov", when: "samedi midi", placeKind: "restaurant", constraints: ["pas touristique"] });
    expect(draftMessage(c, "Raphaël")).toBe(
      "Raphaël cherche un restaurant à Zikhron Ya’akov samedi midi — pas touristique. Tu as une recommandation ?",
    );
  });

  it("parle à la première personne sans prénom", () => {
    expect(draftMessage(criteria({ placeKind: "les deux", city: "Tel Aviv" }), null)).toBe(
      "Je cherche un restaurant ou un bar à Tel Aviv. Tu as une recommandation ?",
    );
  });
});

describe("liens", () => {
  it("un lien privé par jeton", () => {
    expect(replyLink("http://localhost:3000/", "abc")).toBe("http://localhost:3000/r/abc");
  });

  it("ajoute le lien privé au message WhatsApp", () => {
    expect(whatsappText("Une idée ?", "https://where.app/r/x")).toBe("Une idée ?\n\nhttps://where.app/r/x · Répondre en 20 secondes");
  });

  it("construit un lien wa.me avec le numéro international et le texte encodé", () => {
    expect(waMeUrl("+972 50-123-4567", "Salut & merci ?")).toBe("https://wa.me/972501234567?text=Salut%20%26%20merci%20%3F");
    expect(waMeUrl("00972501234567", "x")).toBe("https://wa.me/972501234567?text=x");
  });

  it("sans numéro, laisse l'utilisateur choisir le contact dans WhatsApp", () => {
    expect(waMeUrl(null, "x")).toBe("https://wa.me/?text=x");
  });
});

describe("textes de la maquette", () => {
  it("« Envoyer à Sarah, David et Maya ? »", () => {
    expect(joinNames(["Sarah", "David", "Maya"])).toBe("Sarah, David et Maya");
    expect(joinNames(["Sarah"])).toBe("Sarah");
  });

  it("« Je te préviens dès qu’ils répondent — rien d’autre n’a été envoyé. »", () => {
    expect(askedText(["Sarah", "David"]).text).toBe(
      " sur WhatsApp. Je te préviens dès qu’ils répondent — rien d’autre n’a été envoyé.",
    );
    expect(askedText(["Sarah"]).text).toContain("dès qu’il ou elle répond");
  });
});
