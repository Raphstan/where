import { describe, expect, it } from "vitest";
import { gmailFilterQuery, parseGmailForwardingConfirmation, platformDomain } from "./platforms";

describe("platformDomain", () => {
  it("reconnaît les plateformes et leurs sous-domaines, rien d'autre", () => {
    expect(platformDomain("no-reply@ontopo.com")).toBe("ontopo.com");
    expect(platformDomain("noreply@mail.booking.com")).toBe("booking.com");
    expect(platformDomain("automated@airbnb.com")).toBe("airbnb.com");
    expect(platformDomain("x@ontopo.com.evil.example")).toBeNull();
    expect(platformDomain("x@fakebooking.com")).toBeNull();
    expect(platformDomain(null)).toBeNull();
  });
});

describe("gmailFilterQuery", () => {
  it("ne vise que les plateformes de réservation", () => {
    const q = gmailFilterQuery();
    expect(q.startsWith("from:(")).toBe(true);
    for (const d of ["ontopo.com", "tabit.cloud", "booking.com", "airbnb.com"]) expect(q).toContain(d);
  });
});

describe("parseGmailForwardingConfirmation", () => {
  const from = "Gmail Team <forwarding-noreply@google.com>";

  it("lit le code dans l'objet, quelle que soit la langue, et l'adresse qui l'a demandé", () => {
    expect(
      parseGmailForwardingConfirmation({
        from,
        subject: "(#170012345) Gmail Forwarding Confirmation - Receive Mail from raphael@gmail.com",
        text: "raphael@gmail.com has requested to automatically forward mail to your email address.\nConfirmation code: 170012345",
      }),
    ).toEqual({ code: "170012345", requester: "raphael@gmail.com" });
    expect(
      parseGmailForwardingConfirmation({
        from,
        subject: "(#998877665) Confirmation de transfert Gmail - Recevoir des messages de sarah@gmail.com",
        text: "",
      }),
    ).toEqual({ code: "998877665", requester: "sarah@gmail.com" });
  });

  it("se rabat sur le texte si l'objet ne porte pas le code", () => {
    expect(
      parseGmailForwardingConfirmation({ from, subject: "Gmail Forwarding Confirmation", text: "raphael@gmail.com a demandé…\nCode de confirmation : 123456789" }),
    ).toEqual({ code: "123456789", requester: "raphael@gmail.com" });
  });

  it("ignore tout email qui ne vient pas de Google", () => {
    expect(
      parseGmailForwardingConfirmation({ from: "pirate@exemple.com", subject: "(#170012345) Gmail Forwarding Confirmation", text: "" }),
    ).toBeNull();
  });
});
