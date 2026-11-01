import { describe, expect, it } from "vitest";
import { cityFromAddress } from "./candidate";

describe("cityFromAddress", () => {
  it("prend l'avant-dernier élément", () => {
    expect(cityFromAddress("Ha-Yarkon St 1, Tel Aviv-Yafo, Israel")).toBe("Tel Aviv-Yafo");
  });

  it("retire le code postal", () => {
    expect(cityFromAddress("12 Rue de Rivoli, 75004 Paris, France")).toBe("Paris");
  });

  it("renvoie null sans ville lisible", () => {
    expect(cityFromAddress("Israel")).toBeNull();
    expect(cityFromAddress(null)).toBeNull();
  });
});
