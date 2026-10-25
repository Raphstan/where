import { describe, expect, it } from "vitest";
import { bookingNotes, bookingOptions, BOOKING_TEXT, leavingText, mapsUrl, telUrl, waUrl, type BookingPlace } from "./options";

const bare: BookingPlace = {
  name: "Beit Kandinof",
  address: null,
  city: null,
  googlePlaceId: null,
  websiteUrl: null,
  phone: null,
  whatsapp: null,
  ontopoUrl: null,
  tabitUrl: null,
};

describe("bookingOptions", () => {
  it("n'affiche que les moyens connus, dans l'ordre de la maquette", () => {
    const options = bookingOptions({
      ...bare,
      city: "Tel Aviv",
      ontopoUrl: "https://ontopo.com/fr/il/page/beit-kandinof",
      websiteUrl: "https://kandinof.example",
      phone: "+972 3-555-0101",
      whatsapp: "+972 50-555-0101",
    });
    expect(options.map((o) => o.kind)).toEqual(["ontopo", "site", "tel", "wa", "maps"]);
    expect(options.map((o) => o.label)).toEqual([
      "Réserver avec Ontopo",
      "Ouvrir le site du restaurant",
      "Appeler",
      "Envoyer un WhatsApp",
      "Voir dans Google Maps",
    ]);
  });

  it("n'invente jamais de lien Ontopo ou Tabit", () => {
    const options = bookingOptions({ ...bare, city: "Tel Aviv", websiteUrl: "https://herzl16.example" });
    expect(options.some((o) => o.kind === "ontopo" || o.kind === "tabit")).toBe(false);
    expect(bookingNotes(options)).toEqual([BOOKING_TEXT.noPlatformNote]);
  });

  it("affiche Tabit avec sa note sur les livraisons", () => {
    const options = bookingOptions({ ...bare, tabitUrl: "https://tabitisrael.co.il/herzl-16" });
    expect(options.map((o) => o.kind)).toEqual(["tabit"]);
    expect(bookingNotes(options)).toEqual([
      "Tabit gère aussi des livraisons : seule une réservation de table comptera comme visite.",
    ]);
  });

  it("écarte une URL invalide ou non http", () => {
    const options = bookingOptions({ ...bare, ontopoUrl: "javascript:alert(1)", websiteUrl: "pas une url" });
    expect(options).toEqual([]);
  });

  it("un lieu sans rien de connu n'a aucun moyen", () => {
    expect(bookingOptions(bare)).toEqual([]);
  });
});

describe("liens téléphone, WhatsApp et carte", () => {
  it("compose un numéro tel:", () => {
    expect(telUrl("+972 3-555-0101")).toBe("tel:+97235550101");
    expect(telUrl("03-555-0101")).toBe("tel:035550101");
    expect(telUrl("12")).toBeNull();
  });

  it("n'ouvre WhatsApp qu'avec un numéro international", () => {
    expect(waUrl("+972 50-555-0101")).toBe("https://wa.me/972505550101");
    expect(waUrl("00972505550101")).toBe("https://wa.me/972505550101");
    expect(waUrl("050-555-0101")).toBeNull();
  });

  it("vise le lieu exact avec un place_id, sinon cherche par nom et ville", () => {
    expect(mapsUrl({ ...bare, googlePlaceId: "ChIJ123" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Beit+Kandinof&query_place_id=ChIJ123",
    );
    expect(mapsUrl({ ...bare, city: "Tel Aviv" })).toBe(
      "https://www.google.com/maps/search/?api=1&query=Beit+Kandinof%2C+Tel+Aviv",
    );
    expect(mapsUrl({ ...bare, googleMapsUrl: "https://maps.google.com/?cid=1" })).toBe("https://maps.google.com/?cid=1");
    expect(mapsUrl(bare)).toBeNull();
  });
});

describe("écran « Tu quittes WHERE »", () => {
  it("reprend la phrase de la maquette", () => {
    expect(leavingText("ontopo")).toBe("Tu quittes WHERE pour finaliser ta réservation sur Ontopo.");
    expect(leavingText("tabit")).toBe("Tu quittes WHERE pour finaliser ta réservation sur Tabit.");
    expect(leavingText("tel")).toBe("Tu quittes WHERE pour finaliser ta réservation par téléphone.");
  });
});
