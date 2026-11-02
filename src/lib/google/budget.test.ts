import { describe, expect, it } from "vitest";
import { GOOGLE_BUDGET, skuForUrl } from "./budget";

describe("budget Google (facture à 0)", () => {
  it("reconnaît chaque type d'appel Places API (New)", () => {
    expect(skuForUrl("https://places.googleapis.com/v1/places:autocomplete")).toBe("autocomplete");
    expect(skuForUrl("https://places.googleapis.com/v1/places:searchText")).toBe("text_search");
    expect(skuForUrl("https://places.googleapis.com/v1/places/ChIJLU7jZClu5kcR4PcOOO6p3I0")).toBe("place_details");
  });

  it("refuse tout appel Google Places non budgété", () => {
    expect(skuForUrl("https://places.googleapis.com/v1/places:searchNearby")).toBeNull();
    expect(skuForUrl("https://places.googleapis.com/v1/places/abc/photos/x/media")).toBeNull();
  });

  it("reste sous la part gratuite de chaque palier (10 000 / 5 000 / 1 000)", () => {
    expect(GOOGLE_BUDGET.autocomplete).toBeLessThan(10_000);
    expect(GOOGLE_BUDGET.text_search).toBeLessThan(1_000);
    expect(GOOGLE_BUDGET.place_details).toBeLessThan(1_000);
  });
});
