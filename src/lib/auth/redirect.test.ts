import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

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
