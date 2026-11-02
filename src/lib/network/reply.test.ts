import { describe, expect, it } from "vitest";
import { GuestReplySchema, guestAnswerLevels, replySignals, ownMemorySignals, visitClaim } from "./reply";

const base = {
  token: "0123456789abcdef0123456789abcdef",
  placeName: "Tishbi Winery",
  placeUrl: "",
  googlePlaceId: "",
  placeAddress: "",
  placeCity: "",
  notYet: false,
  note: "Arriver avant 13 h.",
  visibleOnlyToRequester: true,
  reusable: true,
};

describe("mapping réponse invité → niveau de preuve (§ 6.5)", () => {
  it("lieu préféré cité → recommandé, sans visite affirmée", () => {
    expect(guestAnswerLevels(visitClaim({ notYet: false }))).toEqual(["recommended"]);
  });

  it("« Je n'y suis pas encore allé·e » → sauvegardé, jamais visité", () => {
    expect(guestAnswerLevels(visitClaim({ notYet: true }))).toEqual(["saved"]);
  });

  it("anciennes réponses « Oui » → recommandé + visité", () => {
    expect(guestAnswerLevels(true)).toEqual(["recommended", "visited"]);
  });
});

describe("replySignals", () => {
  const input = {
    userId: "u",
    placeId: "p",
    memberId: "sarah",
    memberUserId: null,
    replyId: "r",
    occasion: "famille",
    note: "Arriver avant 13 h.",
    reusable: false,
    visited: true as boolean | null,
  };

  it("attribue chaque preuve au proche, dans la mémoire du demandeur", () => {
    for (const s of replySignals(input)) {
      expect(s).toMatchObject({ user_id: "u", source_member_id: "sarah", source_type: "network_reply", request_reply_id: "r" });
    }
  });

  it("propage le refus de réutilisation", () => {
    expect(replySignals(input).every((s) => s.reusable === false)).toBe(true);
  });

  it("porte la note et l'occasion, la note une seule fois", () => {
    const [reco, visit] = replySignals(input);
    expect(reco).toMatchObject({ evidence_level: "recommended", note: "Arriver avant 13 h.", occasion: ["famille"] });
    expect(visit).toMatchObject({ evidence_level: "visited", note: null });
  });

  it("aucune visite sans « Oui » explicite", () => {
    expect(replySignals({ ...input, visited: null }).map((s) => s.evidence_level)).toEqual(["recommended"]);
    expect(replySignals({ ...input, visited: false }).map((s) => s.evidence_level)).toEqual(["saved"]);
  });
});

describe("GuestReplySchema", () => {
  it("accepte une réponse complète et vide les champs facultatifs", () => {
    const r = GuestReplySchema.parse(base);
    expect(r.placeUrl).toBeNull();
    expect(r.googlePlaceId).toBeNull();
    expect(r.notYet).toBe(false);
  });

  it("garde le lieu Google choisi et refuse un identifiant mal formé", () => {
    const r = GuestReplySchema.parse({ ...base, googlePlaceId: "ChIJLU7jZClu5kcR4PcOOO6p3I0", placeCity: "Paris" });
    expect(r).toMatchObject({ googlePlaceId: "ChIJLU7jZClu5kcR4PcOOO6p3I0", placeCity: "Paris" });
    expect(GuestReplySchema.safeParse({ ...base, googlePlaceId: "../x" }).success).toBe(false);
  });

  it("refuse un jeton mal formé et un lien qui n'est pas http(s)", () => {
    expect(GuestReplySchema.safeParse({ ...base, token: "../../etc" }).success).toBe(false);
    expect(GuestReplySchema.safeParse({ ...base, placeUrl: "javascript:alert(1)" }).success).toBe(false);
    expect(GuestReplySchema.parse({ ...base, placeUrl: "https://maps.app.goo.gl/x" }).placeUrl).toBe("https://maps.app.goo.gl/x");
  });
});

describe("ownMemorySignals (« Garder ma mémoire WH3RE »)", () => {
  const replies = [
    { id: "r1", place_id: "p1", visited: true, note: "Coin calme" },
    { id: "r2", place_id: "p2", visited: false, note: null },
    { id: "r3", place_id: null, visited: true, note: "Lieu inconnu" },
    { id: "r4", place_id: "p4", visited: null, note: null },
  ];

  it("copie « Oui » en recommandé + visité et « on m'en a parlé » en sauvegardé, au nom du proche", () => {
    const rows = ownMemorySignals("sarah", replies, new Set());
    expect(rows.map((r) => [r.request_reply_id, r.evidence_level])).toEqual([
      ["r1", "recommended"],
      ["r1", "visited"],
      ["r2", "saved"],
      ["r4", "recommended"],
    ]);
    // Ses propres mots : aucun proche attribué, provenance manuelle, note sur le premier signal seulement.
    expect(rows.every((r) => r.user_id === "sarah" && r.source_type === "manual" && !("source_member_id" in r))).toBe(true);
    expect(rows.map((r) => r.note)).toEqual(["Coin calme", null, null, null]);
  });

  it("ne recopie jamais une réponse déjà copiée, ni une réponse sans lieu", () => {
    expect(ownMemorySignals("sarah", replies, new Set(["r1", "r2", "r4"]))).toEqual([]);
  });
});
