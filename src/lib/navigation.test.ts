import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isActive } from "./navigation";

describe("navigation", () => {
  it("expose les quatre onglets de la maquette dans l'ordre", () => {
    expect(NAV_ITEMS.flatMap((i) => (i.tabLabel ? [i.tabLabel] : []))).toEqual([
      "Chat",
      "Mémoire",
      "Cercle",
      "Profil",
    ]);
  });

  it("expose la barre latérale de la maquette", () => {
    expect(NAV_ITEMS.map((i) => i.sideLabel)).toEqual([
      "Conversation",
      "Ma mémoire",
      "Mon cercle",
      "Mes sources",
      "Confidentialité",
      "Profil",
    ]);
  });

  it("a des routes uniques", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("marque un onglet actif sur sa route et ses sous-routes seulement", () => {
    expect(isActive("/chat", "/chat")).toBe(true);
    expect(isActive("/chat/abc", "/chat")).toBe(true);
    expect(isActive("/chatter", "/chat")).toBe(false);
    expect(isActive("/memory", "/chat")).toBe(false);
  });
});
