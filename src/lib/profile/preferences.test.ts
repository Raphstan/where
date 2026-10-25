import { describe, expect, it } from "vitest";
import { learnedPreferences } from "./preferences";

describe("learnedPreferences", () => {
  it("retient ce qui revient d'un lieu aimé à l'autre, du plus fréquent au moins fréquent", () => {
    expect(
      learnedPreferences([
        { placeId: "kandinof", vibe: ["intime", "caché"], occasion: ["date"] },
        { placeId: "spicehaus", vibe: ["feutré", "Caché"], occasion: ["date", "calme"] },
        { placeId: "ricci", vibe: ["intime", "caché"], occasion: [] },
      ]),
    ).toEqual(["caché", "date", "intime"]);
  });

  it("un mot compte une fois par lieu, même répété dans plusieurs signaux", () => {
    expect(
      learnedPreferences([
        { placeId: "a", vibe: ["calme"], occasion: ["calme"] },
        { placeId: "a", vibe: ["calme"], occasion: [] },
        { placeId: "b", vibe: ["vivant"], occasion: [] },
      ]),
    ).toEqual([]);
  });

  it("avec un seul lieu, ses mots suffisent ; sans expérience, rien n'est inventé", () => {
    expect(learnedPreferences([{ placeId: "a", vibe: ["terrasse"], occasion: ["amis"] }])).toEqual(["amis", "terrasse"]);
    expect(learnedPreferences([])).toEqual([]);
  });

  it("s'arrête à sept préférences", () => {
    const vibe = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];
    expect(learnedPreferences([{ placeId: "x", vibe, occasion: [] }, { placeId: "y", vibe, occasion: [] }])).toHaveLength(7);
  });
});
