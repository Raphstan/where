import { describe, expect, it } from "vitest";
import { TRUST_DOMAINS, toggleDomain } from "./domains";
import { isMemberError, NewMemberSchema, normalizeDomains } from "./member";
import { translator } from "@/i18n/translator";

const t = translator("fr", "circle");

describe("toggleDomain", () => {
  it("« Tout » remplace les domaines cochés, puis se décoche", () => {
    expect(toggleDomain(["restaurants", "hotels"], "all")).toEqual(["all"]);
    expect(toggleDomain(["all"], "all")).toEqual([]);
  });

  it("cocher un domaine précis retire « Tout »", () => {
    expect(toggleDomain(["all"], "nightlife")).toEqual(["nightlife"]);
    expect(toggleDomain(["restaurants"], "hotels")).toEqual(["restaurants", "hotels"]);
    expect(toggleDomain(["restaurants", "hotels"], "restaurants")).toEqual(["hotels"]);
  });

  it("reprend les domaines de la maquette dans l'ordre", () => {
    expect(TRUST_DOMAINS.map((k) => t(`domains.${k}`))).toEqual([
      "Je lui fais confiance pour tout",
      "Restaurants",
      "Hôtels",
      "Nightlife",
      "Voyages",
      "Activités",
      "Famille",
      "Business",
    ]);
  });

  it("enregistre « Tout » seul et sans doublon", () => {
    expect(normalizeDomains(["hotels", "all", "hotels"])).toEqual(["all"]);
    expect(normalizeDomains(["hotels", "hotels"])).toEqual(["hotels"]);
  });
});

describe("NewMemberSchema", () => {
  it("exige un prénom et un moyen de joindre la personne", () => {
    expect(NewMemberSchema.safeParse({ name: "Sarah", phone: "", email: "" }).success).toBe(false);
    expect(NewMemberSchema.safeParse({ name: " ", phone: "+972 50 555 0101" }).success).toBe(false);
    const ok = NewMemberSchema.parse({ name: " Sarah ", relation: "Amie proche", description: "", phone: "+972 50 555 0101" });
    expect(ok).toEqual({ name: "Sarah", relation: "Amie proche", description: null, phone: "+972 50 555 0101", email: null });
  });

  it("refuse un numéro ou un email invalide", () => {
    expect(NewMemberSchema.safeParse({ name: "Noam", phone: "abc" }).success).toBe(false);
    expect(NewMemberSchema.safeParse({ name: "Noam", email: "noam@" }).success).toBe(false);
    expect(NewMemberSchema.safeParse({ name: "Noam", email: "noam@exemple.com" }).success).toBe(true);
  });

  it("renvoie des clés d'erreur, traduites mot pour mot", () => {
    const messages = (input: unknown) => {
      const r = NewMemberSchema.safeParse(input);
      return r.success ? [] : r.error.issues.map((i) => i.message).filter(isMemberError).map((k) => t(`api.${k}`));
    };
    expect(messages({ name: "Noam", phone: "abc" })).toEqual(["Numéro invalide."]);
    expect(messages({ name: "Noam", email: "noam@" })).toEqual(["Email invalide."]);
    expect(messages({ name: "Noam", phone: "", email: "" })).toEqual(["Un numéro WhatsApp ou un email."]);
  });
});
