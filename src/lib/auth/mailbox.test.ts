import { describe, expect, it } from "vitest";
import { mailbox } from "./mailbox";

describe("mailbox", () => {
  it("ouvre Gmail sur les emails WH3RE, indésirables compris", () => {
    const box = mailbox("Ilan@GMAIL.com");
    expect(box?.name).toBe("Gmail");
    expect(decodeURIComponent(box!.href)).toContain("from:hello@wh3re.com in:anywhere");
  });
  it("reconnaît Outlook, Yahoo, iCloud, Proton", () => {
    expect(mailbox("a@hotmail.fr")?.name).toBe("Outlook");
    expect(mailbox("a@yahoo.co.il")?.name).toBe("Yahoo Mail");
    expect(mailbox("a@icloud.com")?.name).toBe("iCloud Mail");
    expect(mailbox("a@proton.me")?.name).toBe("Proton Mail");
  });
  it("pas de bouton pour un domaine inconnu", () => {
    expect(mailbox("a@yad2.co.il")).toBeNull();
  });
});
