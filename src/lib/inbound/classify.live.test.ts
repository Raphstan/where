import { describe, expect, it } from "vitest";
import { classifyEmail } from "./classify";
import { EXAMPLE_EMAILS } from "./examples";

/**
 * Test en direct contre l'API Anthropic sur des emails transférés réalistes, dont une table Tabit et
 * une livraison Tabit. Lancer : npm run test:live (ANTHROPIC_API_KEY requis dans .env.local). Ignoré sinon.
 */
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);

describe.skipIf(!hasKey)("classification des emails transférés (API réelle)", () => {
  it.each(EXAMPLE_EMAILS.map((e) => [e.key, e] as const))("%s", async (_key, example) => {
    const c = await classifyEmail(example.email);
    expect(c.kind).toBe(example.kind);
    if (example.place) expect(c.placeName?.toLowerCase()).toContain(example.place.toLowerCase());
    if (example.platform && example.kind !== "other") expect(c.platform?.toLowerCase()).toContain(example.platform.toLowerCase());
  });

  it("Tabit table : date extraite", async () => {
    const c = await classifyEmail(EXAMPLE_EMAILS.find((e) => e.key === "tabit-table")!.email);
    expect(c.reservedFor).toBe("2026-09-12");
  });
});
