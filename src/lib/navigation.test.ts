import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/translator";
import { SIDE_ITEMS, TAB_ITEMS, isActive } from "./navigation";

const t = translator("fr", "nav");

describe("navigation", () => {
  it("expose les quatre onglets de la maquette dans l'ordre", () => {
    expect(TAB_ITEMS.map((i) => t(`tab.${i.key}`))).toEqual(["Chat", "Mémoire", "Cercle", "Profil"]);
  });

  it("expose la barre latérale : connecteurs, cercle, mémoire (ni démo des états limites, ni confidentialité)", () => {
    expect(SIDE_ITEMS.map((i) => t(`side.${i.key}`))).toEqual(["Connecteurs", "Mon cercle", "Ma mémoire"]);
  });

  it("a des routes uniques", () => {
    for (const items of [TAB_ITEMS, SIDE_ITEMS]) {
      const hrefs = items.map((i) => i.href);
      expect(new Set(hrefs).size).toBe(hrefs.length);
    }
  });

  it("marque un onglet actif sur sa route et ses sous-routes seulement", () => {
    expect(isActive("/chat", "/chat")).toBe(true);
    expect(isActive("/chat/abc", "/chat")).toBe(true);
    expect(isActive("/chatter", "/chat")).toBe(false);
    expect(isActive("/memory", "/chat")).toBe(false);
  });
});
