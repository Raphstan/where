import { describe, expect, it } from "vitest";
import { translator } from "@/i18n/translator";
import { search } from "@/lib/search/search";
import { DEMO_CRITERIA, demoMemory, localizeDemoResult } from "./memory";

const NOW = new Date("2026-11-01T12:00:00Z");

async function demo(locale: "fr" | "en" | "he") {
  const response = await search(DEMO_CRITERIA, {
    tr: { t: translator(locale, "search"), ev: translator(locale, "evidence") },
    network: translator(locale, "network"),
    locale,
    memory: demoMemory(NOW, locale),
    googlePlacesApiKey: undefined,
    now: NOW,
  });
  return response.results.map((r) => localizeDemoResult(r, locale));
}

describe("démonstration", () => {
  it("donne trois lieux du cercle de la maquette, Beit Kandinof en tête pour un date", async () => {
    const results = await demo("fr");
    expect(results).toHaveLength(3);
    expect(results[0].name).toBe("Beit Kandinof");
    expect(results.every((r) => r.origin === "personal")).toBe(true);
  });

  it("n'affiche plus les critères français en anglais ni en hébreu", async () => {
    for (const locale of ["en", "he"] as const) {
      const text = JSON.stringify(await demo(locale));
      expect(text, locale).not.toMatch(/caché|ce soir|Restaurant & galerie|Marché aux puces/);
    }
  });
});
