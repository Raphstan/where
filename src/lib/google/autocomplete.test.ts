import { describe, expect, it } from "vitest";
import { nearFromHeaders, suggestPlaces, type FetchLike } from "./autocomplete";

const reply = (body: unknown): FetchLike => async () => new Response(JSON.stringify(body), { status: 200 });

describe("suggestPlaces", () => {
  it("rend nom, adresse courte, ville et identifiant Google", async () => {
    const fetchImpl = reply({
      suggestions: [
        {
          placePrediction: {
            placeId: "ChIJLU7jZClu5kcR4PcOOO6p3I0",
            structuredFormat: { mainText: { text: "Café de Flore" }, secondaryText: { text: "Boulevard Saint-Germain, Paris, France" } },
          },
        },
      ],
    });
    expect(await suggestPlaces("Café de Fl", "k", "fr", null, fetchImpl)).toEqual([
      { googlePlaceId: "ChIJLU7jZClu5kcR4PcOOO6p3I0", name: "Café de Flore", address: "Boulevard Saint-Germain, Paris, France", city: "Paris" },
    ]);
  });

  it("n'appelle pas Google avant 3 lettres", async () => {
    let called = false;
    await suggestPlaces("Ca", "k", "fr", null, async () => {
      called = true;
      return new Response("{}");
    });
    expect(called).toBe(false);
  });

  it("envoie la position du proche comme préférence, pas comme filtre", async () => {
    let body: Record<string, unknown> = {};
    await suggestPlaces("Port Said", "k", "fr", { latitude: 32.08, longitude: 34.78 }, async (_url, init) => {
      body = JSON.parse(String(init.body));
      return new Response("{}");
    });
    expect(body.locationBias).toEqual({ circle: { center: { latitude: 32.08, longitude: 34.78 }, radius: 50_000 } });
    expect(body.locationRestriction).toBeUndefined();
  });

  it("rend une liste vide si Google refuse (budget épuisé, clé invalide)", async () => {
    expect(await suggestPlaces("Café", "k", "fr", null, async () => new Response("{}", { status: 429 }))).toEqual([]);
  });
});

describe("nearFromHeaders", () => {
  it("lit la position donnée par Vercel", () => {
    const h = new Headers({ "x-vercel-ip-latitude": "32.0809", "x-vercel-ip-longitude": "34.7806" });
    expect(nearFromHeaders(h)).toEqual({ latitude: 32.0809, longitude: 34.7806 });
  });

  it("ignore une position absente ou invalide", () => {
    expect(nearFromHeaders(new Headers())).toBeNull();
    expect(nearFromHeaders(new Headers({ "x-vercel-ip-latitude": "abc", "x-vercel-ip-longitude": "1" }))).toBeNull();
  });
});
