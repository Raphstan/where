import { describe, expect, it } from "vitest";
import { verifiedEmailFromClaims } from "./google";

const CLIENT = "123-abc.apps.googleusercontent.com";
const valid = { iss: "https://accounts.google.com", aud: CLIENT, email: "Sarah@Example.com", email_verified: "true" };

describe("verifiedEmailFromClaims", () => {
  it("rend l'email vérifié, en minuscules", () => {
    expect(verifiedEmailFromClaims(valid, CLIENT)).toBe("sarah@example.com");
  });

  it("refuse un jeton destiné à une autre appli", () => {
    expect(verifiedEmailFromClaims({ ...valid, aud: "autre.apps.googleusercontent.com" }, CLIENT)).toBeNull();
  });

  it("refuse un email non vérifié", () => {
    expect(verifiedEmailFromClaims({ ...valid, email_verified: "false" }, CLIENT)).toBeNull();
  });

  it("refuse un autre émetteur", () => {
    expect(verifiedEmailFromClaims({ ...valid, iss: "https://evil.example" }, CLIENT)).toBeNull();
  });

  it("refuse une réponse sans email", () => {
    expect(verifiedEmailFromClaims({ iss: valid.iss, aud: CLIENT, email_verified: "true" }, CLIENT)).toBeNull();
  });
});
