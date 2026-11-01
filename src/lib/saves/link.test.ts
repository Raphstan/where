import { describe, expect, it } from "vitest";
import { findSharedLink, parseMapsUrl } from "./link";

describe("findSharedLink", () => {
  it("ignore un message sans lien", () => {
    expect(findSharedLink("Un bar calme à Jaffa ce soir")).toBeNull();
  });

  it("reconnaît la provenance", () => {
    expect(findSharedLink("https://maps.app.goo.gl/AbCd123")?.source).toBe("maps");
    expect(findSharedLink("https://www.google.com/maps/place/Port+Said/@32.06,34.77,17z")?.source).toBe("maps");
    expect(findSharedLink("https://vm.tiktok.com/ZMabc/")?.source).toBe("tiktok");
    expect(findSharedLink("https://www.tiktok.com/@foodie/video/123")?.source).toBe("tiktok");
    expect(findSharedLink("https://www.instagram.com/p/Cxyz/")?.source).toBe("instagram");
    expect(findSharedLink("https://www.google.com/search?q=bar")?.source).toBe("web");
    expect(findSharedLink("https://portsaid.co.il")?.source).toBe("web");
  });

  it("garde le texte autour du lien et retire la ponctuation finale", () => {
    const link = findSharedLink("Super pour un date https://www.instagram.com/p/Cxyz/). Merci");
    expect(link?.url).toBe("https://www.instagram.com/p/Cxyz/");
    expect(link?.text).toBe("Super pour un date Merci");
  });
});

describe("parseMapsUrl", () => {
  it("lit le nom et le repère du lieu", () => {
    const hint = parseMapsUrl(
      "https://www.google.com/maps/place/Port+Sa%C3%AFd/@32.0626,34.7701,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d32.0627!4d34.7714",
    );
    expect(hint).toEqual({ name: "Port Saïd", lat: 32.0627, lng: 34.7714 });
  });

  it("lit une recherche ?q=", () => {
    expect(parseMapsUrl("https://maps.google.com/?q=Cafe+Xoho+Tel+Aviv").name).toBe("Cafe Xoho Tel Aviv");
  });

  it("n'invente pas de nom à partir de coordonnées", () => {
    expect(parseMapsUrl("https://maps.google.com/?q=32.06,34.77").name).toBeNull();
  });

  it("supporte une adresse illisible", () => {
    expect(parseMapsUrl("pas une adresse")).toEqual({ name: null, lat: null, lng: null });
  });
});
