import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "./cron";

describe("isCronAuthorized", () => {
  const secret = "0123456789abcdef0123";

  it("accepte l'en-tête envoyé par Vercel Cron", () => {
    expect(isCronAuthorized(`Bearer ${secret}`, secret)).toBe(true);
  });

  it("refuse un autre secret, un en-tête absent ou un secret non configuré", () => {
    expect(isCronAuthorized("Bearer nope", secret)).toBe(false);
    expect(isCronAuthorized(null, secret)).toBe(false);
    expect(isCronAuthorized("Bearer ", undefined)).toBe(false);
  });
});
