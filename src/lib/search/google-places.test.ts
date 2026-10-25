import { describe, expect, it, vi } from "vitest";
import { criteria } from "@/test/search-fixtures";
import {
  discoveryQuery,
  discoveryResult,
  pickDiscovery,
  PLACES_SEARCH_URL,
  searchGooglePlaces,
  type FetchLike,
  type GooglePlace,
} from "./google-places";

const cqc: GooglePlace = {
  id: "ChIJcqc",
  displayName: { text: "C’est Quelque Chose" },
  shortFormattedAddress: "Florentin, Tel Aviv",
  primaryTypeDisplayName: { text: "Bistrot" },
  businessStatus: "OPERATIONAL",
  rating: 4.6,
  userRatingCount: 312,
  googleMapsUri: "https://maps.google.com/?cid=1",
};

function fakeFetch(body: unknown, ok = true) {
  return vi.fn<FetchLike>(async () => new Response(JSON.stringify(body), { status: ok ? 200 : 403 }));
}

describe("searchGooglePlaces", () => {
  it("appelle Text Search avec la clé, le masque de champs et le français", async () => {
    const f = fakeFetch({ places: [cqc] });
    const places = await searchGooglePlaces("bistrot caché Tel Aviv", "KEY", f);
    expect(places).toEqual([cqc]);
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe(PLACES_SEARCH_URL);
    expect((init.headers as Record<string, string>)["X-Goog-Api-Key"]).toBe("KEY");
    expect((init.headers as Record<string, string>)["X-Goog-FieldMask"]).toContain("places.displayName");
    expect(JSON.parse(init.body as string)).toMatchObject({ textQuery: "bistrot caché Tel Aviv", languageCode: "fr" });
  });

  it("ignore les entrées invalides et renvoie une liste vide en cas d'erreur", async () => {
    expect(await searchGooglePlaces("q", "KEY", fakeFetch({ places: [{ id: "" }, cqc] }))).toEqual([cqc]);
    expect(await searchGooglePlaces("q", "KEY", fakeFetch({ error: "denied" }, false))).toEqual([]);
    expect(await searchGooglePlaces("q", "KEY", vi.fn<FetchLike>(async () => Promise.reject(new Error("réseau"))))).toEqual([]);
  });
});

describe("découverte", () => {
  it("construit la requête à partir des critères, et refuse sans lieu", () => {
    expect(discoveryQuery(criteria({ placeKind: "bar", vibe: ["caché"], city: "Tel Aviv" }))).toBe("bar caché Tel Aviv");
    expect(discoveryQuery(criteria({ placeKind: "les deux", city: "Tel Aviv" }))).toBe("restaurant Tel Aviv");
    expect(discoveryQuery(criteria({ placeKind: "bar" }))).toBeNull();
  });

  it("écarte les lieux fermés et ceux déjà dans la mémoire", () => {
    const closed = { ...cqc, id: "closed", businessStatus: "CLOSED_PERMANENTLY" };
    expect(pickDiscovery([closed, cqc], new Set(), new Set())).toBe(cqc);
    expect(pickDiscovery([cqc], new Set(["ChIJcqc"]), new Set())).toBeNull();
    expect(pickDiscovery([cqc], new Set(), new Set(["c’est quelque chose"]))).toBeNull();
  });

  it("produit une carte « Découverte » exploratoire, hors du cercle, sans personne", () => {
    const r = discoveryResult(cqc, criteria({ when: "ce soir" }), 2);
    expect(r).toMatchObject({
      origin: "discovery",
      rank: "Découverte",
      headline: "Une découverte, pas encore validée par ton cercle",
      confidence: { level: "explo", text: "Exploratoire — informations publiques uniquement" },
      people: [],
      unknowns: ["Aucun signal personnel", "Ambiance réelle non confirmée", "Disponibilité ce soir non vérifiée"],
    });
    expect(r.lines.map((l) => [l.text, l.label, l.provenance, l.person])).toEqual([
      ["Aucun proche ne l’a encore recommandé", "Information publique", "du web public", null],
      ["Note publique de 4,6 sur 5 (312 avis Google)", "Information publique", "du web public", null],
    ]);
  });
});
