import { describe, expect, it } from "vitest";
import { criteria, place, rows, sig, SARAH, DAVID } from "@/test/search-fixtures";
import { MAX_PRESELECTED, suggestPeople, type CircleMember } from "./suggest";

const member = (id: string, name: string, trustDomains: string[]): CircleMember => ({ id, name, trustDomains, phone: null });

const sarah = member("sarah", "Sarah", ["restaurants", "hotels"]);
const noam = member("noam", "Noam", ["nightlife"]);
const maya = member("maya", "Maya", ["restaurants", "activities"]);
const david = member("david", "David", ["travel", "family", "activities"]);
const circle = [noam, maya, david, sarah];

describe("suggestPeople", () => {
  it("propose d'abord les proches dont les domaines couvrent le type de lieu", () => {
    const out = suggestPeople(circle, [], criteria({ placeKind: "restaurant" }));
    expect(out.slice(0, 2).map((p) => p.name).sort()).toEqual(["Maya", "Sarah"]);
    expect(out.find((p) => p.name === "Sarah")).toMatchObject({ reason: "Tu lui fais confiance pour les restaurants", relevant: true });
  });

  it("explique pourquoi un proche est moins pertinent, et ne le coche pas", () => {
    const out = suggestPeople(circle, [], criteria({ placeKind: "restaurant" }));
    expect(out.find((p) => p.name === "Noam")).toMatchObject({ reason: "Moins pertinent ici — bars & nightlife", relevant: false });
  });

  it("« Connaît bien la région » quand la mémoire lui attribue plusieurs lieux dans la zone", () => {
    const zik = (id: string) => place(id, { city: "Zikhron Ya’akov" });
    const memory = [...rows(zik("a"), [sig("visited", DAVID)]), ...rows(zik("b"), [sig("booked", DAVID)])];
    const out = suggestPeople(circle, memory, criteria({ city: "Zikhron Ya’akov", placeKind: "restaurant" }));
    expect(out[0]).toMatchObject({ name: "David", reason: "Connaît bien la région", relevant: true });
  });

  it("ne déduit rien d'un lieu ailleurs ni d'une information publique", () => {
    const memory = [...rows(place("x", { city: "Rome" }), [sig("recommended", SARAH)])];
    const out = suggestPeople([sarah], memory, criteria({ city: "Tel Aviv", placeKind: "bar" }));
    expect(out[0]!.reason).not.toBe("Connaît bien la région");
  });

  it("un repas sans type de lieu (« samedi midi ») vise les restaurants (maquette, scénario zikhron)", () => {
    const out = suggestPeople(circle, [], criteria({ city: "Zikhron Ya’akov", when: "samedi midi", occasion: "famille" }));
    expect(out.filter((p) => p.relevant).map((p) => p.name).sort()).toEqual(["David", "Maya", "Sarah"]);
    expect(out.find((p) => p.name === "Noam")).toMatchObject({ relevant: false, reason: "Moins pertinent ici — bars & nightlife" });
  });

  it("tient compte de l'occasion : « famille » met en avant le domaine Famille", () => {
    const out = suggestPeople(circle, [], criteria({ occasion: "famille" }));
    expect(out[0]).toMatchObject({ name: "David", reason: "Tu lui fais confiance pour la famille", relevant: true });
  });

  it("« Je lui fais confiance pour tout » rend pertinent partout", () => {
    const all = member("x", "Lia", ["all"]);
    expect(suggestPeople([all], [], criteria({ placeKind: "hôtel" }))[0]).toMatchObject({
      reason: "Tu lui fais confiance pour tout",
      relevant: true,
    });
  });

  it(`coche au plus ${MAX_PRESELECTED} personnes, visiblement, et respecte la limite`, () => {
    const many = ["A", "B", "C", "D", "E"].map((n) => member(n, n, ["all"]));
    const out = suggestPeople(many, [], criteria(), 10);
    expect(out).toHaveLength(5);
    expect(out.filter((p) => p.relevant)).toHaveLength(MAX_PRESELECTED);
    expect(suggestPeople(many, [], criteria())).toHaveLength(4);
  });
});
