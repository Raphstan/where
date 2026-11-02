import { describe, expect, it } from "vitest";
import { verifiedIdentityFromClaims } from "./google";

const CLIENT = "123-abc.apps.googleusercontent.com";
const valid = { iss: "https://accounts.google.com", aud: CLIENT, email: "Sarah@Example.com", email_verified: "true" };

describe("verifiedIdentityFromClaims", () => {
  it("rend l'email vérifié, en minuscules", () => {
    expect(verifiedIdentityFromClaims(valid, CLIENT)?.email).toBe("sarah@example.com");
  });

  it("rend le prénom donné par Google", () => {
    expect(verifiedIdentityFromClaims({ ...valid, given_name: " Sarah ", name: "Sarah Cohen" }, CLIENT)?.firstName).toBe("Sarah");
  });

  it("prend le premier mot du nom complet à défaut de prénom", () => {
    expect(verifiedIdentityFromClaims({ ...valid, name: "Sarah Cohen" }, CLIENT)?.firstName).toBe("Sarah");
  });

  it("rend un prénom null si Google n'en donne pas", () => {
    expect(verifiedIdentityFromClaims(valid, CLIENT)?.firstName).toBeNull();
  });

  it("refuse un jeton destiné à une autre appli", () => {
    expect(verifiedIdentityFromClaims({ ...valid, aud: "autre.apps.googleusercontent.com" }, CLIENT)).toBeNull();
  });

  it("refuse un email non vérifié", () => {
    expect(verifiedIdentityFromClaims({ ...valid, email_verified: "false" }, CLIENT)).toBeNull();
  });

  it("refuse un autre émetteur", () => {
    expect(verifiedIdentityFromClaims({ ...valid, iss: "https://evil.example" }, CLIENT)).toBeNull();
  });

  it("refuse une réponse sans email", () => {
    expect(verifiedIdentityFromClaims({ iss: valid.iss, aud: CLIENT, email_verified: "true" }, CLIENT)).toBeNull();
  });
});
