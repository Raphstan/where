import { describe, expect, it } from "vitest";
import { conflictNotice, noiseConflict } from "./conflict";
import type { MemorySignal } from "./signal";

const member = (id: string, name: string) => ({ kind: "member" as const, id, name, trustDomains: [] });
function s(author: MemorySignal["author"], level: MemorySignal["level"], note: string | null, occasion: string[] = []): MemorySignal {
  return { id: Math.random().toString(), level, author, occasion, note, createdAt: new Date("2026-09-01") };
}
const sarah = member("s", "Sarah");
const noam = member("n", "Noam");

describe("noiseConflict", () => {
  it("détecte le cas Spicehaus de la maquette, avec la nuance horaire", () => {
    const c = noiseConflict([
      s(sarah, "recommended", null, ["date", "calme"]),
      s(noam, "visited", "bruyant après 22 h, DJ le jeudi", ["amis"]),
    ]);
    expect(c).toEqual({ calm: "Sarah", noisy: "Noam", after: "22 h" });
    expect(conflictNotice(c!)).toBe(
      "Signaux contradictoires : Sarah le trouve calme, Noam indique qu’il devient bruyant après 22 h. Probablement calme en début de soirée, animé ensuite.",
    );
  });

  it("un avis déjà nuancé (« calme avant 22 h ») ne contredit pas", () => {
    expect(
      noiseConflict([s(noam, "visited", "On peut parler tranquillement avant 22 h"), s(sarah, "visited", "bruyant après 22 h")]),
    ).toBeNull();
  });

  it("« pas trop bruyant » est un avis calme, pas bruyant", () => {
    expect(noiseConflict([s(sarah, "recommended", "pas trop bruyant"), s(noam, "visited", "génial")])).toBeNull();
  });

  it("il faut deux proches différents ; l'utilisateur n'est jamais cité", () => {
    expect(noiseConflict([s(sarah, "recommended", "calme"), s(sarah, "visited", "bruyant le samedi")])).toBeNull();
    expect(noiseConflict([s({ kind: "self" }, "visited", "calme"), s(noam, "visited", "bruyant")])).toBeNull();
  });

  it("sans heure, WHERE donne les deux avis sans inventer de nuance", () => {
    const c = noiseConflict([s(sarah, "recommended", "très calme"), s(noam, "visited", "trop de bruit")]);
    expect(conflictNotice(c!)).toBe(
      "Signaux contradictoires : Sarah le trouve calme, Noam le trouve bruyant. Je te donne les deux avis plutôt que de trancher.",
    );
  });
});
