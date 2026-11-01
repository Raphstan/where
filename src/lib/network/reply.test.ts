import { describe, expect, it } from "vitest";
import { GuestReplySchema, guestAnswerLevels, replySignals, ownMemorySignals } from "./reply";

const base = {
  token: "0123456789abcdef0123456789abcdef",
  placeName: "Tishbi Winery",
  placeUrl: "",
  visited: "oui",
  note: "Arriver avant 13 h.",
  visibleOnlyToRequester: true,
  reusable: true,
};

describe("mapping réponse invité → niveau de preuve (§ 6.5)", () => {
  it("« Oui » → recommandé + visité", () => {
    expect(guestAnswerLevels("oui")).toEqual(["recommended", "visited"]);
  });

  it("« Non, mais on m’en a parlé » → sauvegardé, jamais visité", () => {
    expect(guestAnswerLevels("non")).toEqual(["saved"]);
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
    visited: "oui" as const,
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

  it("aucune visite quand le proche n'y est pas allé", () => {
    expect(replySignals({ ...input, visited: "non" }).map((s) => s.evidence_level)).toEqual(["saved"]);
  });
});

describe("GuestReplySchema", () => {
  it("accepte une réponse complète et vide les champs facultatifs", () => {
    const r = GuestReplySchema.parse(base);
    expect(r.placeUrl).toBeNull();
    expect(r.visited).toBe("oui");
  });

  it("exige une réponse explicite à « Tu y es réellement allé·e ? »", () => {
    expect(GuestReplySchema.safeParse({ ...base, visited: undefined }).success).toBe(false);
    expect(GuestReplySchema.safeParse({ ...base, visited: "peut-être" }).success).toBe(false);
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
  ];

  it("copie « Oui » en recommandé + visité et « on m'en a parlé » en sauvegardé, au nom du proche", () => {
    const rows = ownMemorySignals("sarah", replies, new Set());
    expect(rows.map((r) => [r.request_reply_id, r.evidence_level])).toEqual([
      ["r1", "recommended"],
      ["r1", "visited"],
      ["r2", "saved"],
    ]);
    // Ses propres mots : aucun proche attribué, provenance manuelle, note sur le premier signal seulement.
    expect(rows.every((r) => r.user_id === "sarah" && r.source_type === "manual" && !("source_member_id" in r))).toBe(true);
    expect(rows.map((r) => r.note)).toEqual(["Coin calme", null, null]);
  });

  it("ne recopie jamais une réponse déjà copiée, ni une réponse sans lieu", () => {
    expect(ownMemorySignals("sarah", replies, new Set(["r1", "r2"]))).toEqual([]);
  });
});
