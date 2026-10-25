import { describe, expect, it } from "vitest";
import { nextAfterLogin, safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it("garde un chemin interne", () => {
    expect(safeNextPath("/memory")).toBe("/memory");
    expect(safeNextPath("/chat/abc?x=1")).toBe("/chat/abc?x=1");
  });

  it("refuse les redirections externes et les valeurs vides", () => {
    expect(safeNextPath("https://evil.example")).toBe("/chat");
    expect(safeNextPath("//evil.example")).toBe("/chat");
    expect(safeNextPath("/\\evil.example")).toBe("/chat");
    expect(safeNextPath(null)).toBe("/chat");
    expect(safeNextPath("", "/memory")).toBe("/memory");
  });
});

describe("nextAfterLogin", () => {
  it("reprend la page demandée avant la connexion, même si l'email renvoie vers /chat", () => {
    expect(nextAfterLogin("/chat", "/onboarding")).toBe("/onboarding");
    expect(nextAfterLogin(null, "/chat?q=Un%20caf%C3%A9")).toBe("/chat?q=Un%20caf%C3%A9");
  });

  it("préfère une destination explicite, et refuse une destination externe", () => {
    expect(nextAfterLogin("/memory", "/onboarding")).toBe("/memory");
    expect(nextAfterLogin("/chat", "https://evil.example")).toBe("/chat");
    expect(nextAfterLogin(undefined, undefined)).toBe("/chat");
  });
});
