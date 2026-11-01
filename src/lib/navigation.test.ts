import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/translator";
import { NAV_ITEMS, isActive } from "./navigation";

const t = translator("fr", "nav");

describe("navigation", () => {
  it("expose les quatre onglets de la maquette dans l'ordre", () => {
    expect(NAV_ITEMS.flatMap((i) => (i.tab ? [t(`tab.${i.key}`)] : []))).toEqual([
      "Chat",
      "Mémoire",
      "Cercle",
      "Profil",
    ]);
  });

  it("expose la barre latérale (sans l’écran de démo des états limites)", () => {
    expect(NAV_ITEMS.map((i) => t(`side.${i.key}`))).toEqual([
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
