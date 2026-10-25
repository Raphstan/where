import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { emailAddress, emailText, forwardToken, htmlToText, isVerifiedSender, verifyWebhookSignature } from "./resend";

const SECRET = `whsec_${Buffer.from("secret-de-test-0123456789").toString("base64")}`;
const NOW = new Date("2026-10-25T10:00:00Z");
const TS = String(Math.floor(NOW.getTime() / 1000));

function sign(body: string, id = "msg_1", ts = TS, secret = SECRET) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  return `v1,${createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest("base64")}`;
}

describe("verifyWebhookSignature", () => {
  const body = '{"type":"email.received"}';

  it("accepte une signature Svix valide, y compris parmi plusieurs", () => {
    expect(verifyWebhookSignature(body, { id: "msg_1", timestamp: TS, signature: sign(body) }, SECRET, NOW)).toBe(true);
    expect(verifyWebhookSignature(body, { id: "msg_1", timestamp: TS, signature: `v1,AAAA ${sign(body)}` }, SECRET, NOW)).toBe(true);
  });

  it("refuse un corps modifié, un autre secret, un horodatage trop ancien ou l'absence de secret", () => {
    const signature = sign(body);
    expect(verifyWebhookSignature(`${body} `, { id: "msg_1", timestamp: TS, signature }, SECRET, NOW)).toBe(false);
    expect(verifyWebhookSignature(body, { id: "msg_1", timestamp: TS, signature }, `whsec_${Buffer.from("autre").toString("base64")}`, NOW)).toBe(false);
    const old = String(Number(TS) - 600);
    expect(verifyWebhookSignature(body, { id: "msg_1", timestamp: old, signature: sign(body, "msg_1", old) }, SECRET, NOW)).toBe(false);
    expect(verifyWebhookSignature(body, { id: "msg_1", timestamp: TS, signature }, undefined, NOW)).toBe(false);
    expect(verifyWebhookSignature(body, { id: null, timestamp: TS, signature }, SECRET, NOW)).toBe(false);
  });
});

describe("adresse de transfert", () => {
  it("retrouve le jeton parmi les destinataires, sur notre domaine seulement", () => {
    expect(forwardToken(["WHERE <inbox+abc123def456@where.app>"], "where.app")).toBe("abc123def456");
    expect(forwardToken(["someone@gmail.com", "inbox+abc123def456@where.app"], "where.app")).toBe("abc123def456");
    expect(forwardToken(["inbox+abc123def456@evil.app"], "where.app")).toBeNull();
    expect(forwardToken(["inbox+abc123def456@where.app.evil.com"], "where.app")).toBeNull();
    expect(forwardToken(["inbox@where.app"], "where.app")).toBeNull();
  });

  it("extrait l'adresse d'un expéditeur", () => {
    expect(emailAddress("Raphaël <Raphael@Exemple.com>")).toBe("raphael@exemple.com");
    expect(emailAddress("raphael@exemple.com")).toBe("raphael@exemple.com");
    expect(emailAddress("pas une adresse")).toBeNull();
  });
});

describe("isVerifiedSender", () => {
  it("exige l'adresse du compte, sans échec d'authentification", () => {
    expect(isVerifiedSender({ from: "R <r@exemple.com>", authentication: { spf: "pass", dkim: "pass", dmarc: "pass" } }, "R@exemple.com")).toBe(true);
    expect(isVerifiedSender({ from: "r@exemple.com", authentication: null }, "r@exemple.com")).toBe(true);
    expect(isVerifiedSender({ from: "autre@exemple.com", authentication: null }, "r@exemple.com")).toBe(false);
    expect(isVerifiedSender({ from: "r@exemple.com", authentication: { dmarc: "fail" } }, "r@exemple.com")).toBe(false);
    expect(isVerifiedSender({ from: "r@exemple.com", authentication: { spf: "fail", dkim: "fail" } }, "r@exemple.com")).toBe(false);
  });
});

describe("texte de l'email", () => {
  it("convertit le HTML en texte lisible", () => {
    const html = "<html><head><style>p{}</style></head><body><p>Votre table chez <b>MILA</b>&nbsp;est confirm&eacute;e</p><p>2&#160;convives</p><script>x()</script></body></html>";
    expect(htmlToText(html)).toBe("Votre table chez MILA est confirmée\n2 convives");
  });

  it("préfère la version texte quand elle existe", () => {
    expect(emailText({ text: " Bonjour ", html: "<p>Autre</p>" })).toBe("Bonjour");
    expect(emailText({ text: null, html: "<p>Autre</p>" })).toBe("Autre");
  });
});
