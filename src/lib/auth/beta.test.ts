import { describe, expect, it } from "vitest";
import { decideBetaAccess, guestTokenFromNext, termsGate } from "./beta";

const TOKEN = "22acf3398f984b54801f532d131a4bad";

describe("accès à la bêta privée", () => {
  it("laisse toujours entrer un compte existant", () => {
    expect(decideBetaAccess({ existing: true, invited: false, validGuestToken: false })).toBe("existing");
  });

  it("crée le compte d'un email invité, ou d'un proche arrivé par son lien privé", () => {
    expect(decideBetaAccess({ existing: false, invited: true, validGuestToken: false })).toBe("invited");
    expect(decideBetaAccess({ existing: false, invited: false, validGuestToken: true })).toBe("guest");
  });

  it("met tous les autres en liste d'attente", () => {
    expect(decideBetaAccess({ existing: false, invited: false, validGuestToken: false })).toBe("waitlist");
  });

  it("ne lit un jeton d'invitation que dans /join/{jeton}", () => {
    expect(guestTokenFromNext(`/join/${TOKEN}`)).toBe(TOKEN);
    expect(guestTokenFromNext(`/join/${TOKEN}/x`)).toBeNull();
    expect(guestTokenFromNext(`/chat?next=/join/${TOKEN}`)).toBeNull();
    expect(guestTokenFromNext("/join/abc")).toBeNull();
    expect(guestTokenFromNext(null)).toBeNull();
  });

  it("ne crée aucun compte sans acceptation des conditions", () => {
    expect(termsGate("invited", false)).toBe("termsRequired");
    expect(termsGate("guest", false)).toBe("termsRequired");
    expect(termsGate("invited", true)).toBe("invited");
    expect(termsGate("guest", true)).toBe("guest");
  });

  it("laisse entrer un compte existant sans la case, et ne change rien à la liste d'attente", () => {
    expect(termsGate("existing", false)).toBe("existing");
    expect(termsGate("waitlist", true)).toBe("waitlist");
  });
});
