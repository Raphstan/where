import { describe, expect, it } from "vitest";
import { criteria } from "@/test/search-fixtures";
import { kindCategories, looselyEqual, placeMatchesCriteria, withoutTag, withTag } from "./match";

const facts = { city: "Tel Aviv", area: "Jaffa · Marché aux puces", address: null, kind: "Bar-restaurant", vibe: [] };

describe("correspondance des critères", () => {
  it("compare sans accents ni casse, par inclusion", () => {
    expect(looselyEqual("Tel Aviv", "tel aviv-yafo")).toBe(true);
    expect(looselyEqual("Hôtel", "hotel")).toBe(true);
    expect(looselyEqual("Rome", "Tel Aviv")).toBe(false);
  });

  it("reconnaît les types de lieu, y compris « les deux »", () => {
    expect([...kindCategories("Bar-restaurant")].sort()).toEqual(["bar", "restaurant"]);
    expect([...kindCategories("les deux")].sort()).toEqual(["bar", "restaurant"]);
    expect(kindCategories("surprends-moi").size).toBe(0);
  });

  it("n'exclut que sur contradiction, jamais sur donnée manquante", () => {
    expect(placeMatchesCriteria(facts, criteria({ placeKind: "bar" }))).toBe(true);
    expect(placeMatchesCriteria(facts, criteria({ placeKind: "hôtel" }))).toBe(false);
    expect(placeMatchesCriteria({ ...facts, kind: null }, criteria({ placeKind: "hôtel" }))).toBe(true);
    expect(placeMatchesCriteria(facts, criteria({ city: "Jaffa" }))).toBe(true);
    expect(placeMatchesCriteria(facts, criteria({ city: "Haïfa" }))).toBe(false);
  });
});

describe("chips de critères", () => {
  const c = criteria({ city: "Tel Aviv", when: "ce soir", partySize: 2, occasion: "date", vibe: ["caché"] });

  it("retirer une chip vide le critère correspondant", () => {
    expect(withoutTag(c, "Tel Aviv").city).toBeNull();
    expect(withoutTag(c, "date").occasion).toBeNull();
    expect(withoutTag(c, "caché").vibe).toEqual([]);
    expect(withoutTag(c, "deux personnes").partySize).toBeNull();
    expect(withoutTag(c, "caché").city).toBe("Tel Aviv");
  });

  it("ajouter une chip l'ajoute aux ambiances souhaitées, sans doublon", () => {
    expect(withTag(c, "terrasse").vibe).toEqual(["caché", "terrasse"]);
    expect(withTag(c, "Caché").vibe).toEqual(["caché"]);
  });
});
