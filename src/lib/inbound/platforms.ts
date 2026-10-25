import { emailAddress } from "./resend";

/**
 * Plateformes de réservation dont un filtre Gmail peut transférer les emails automatiquement.
 * Un email transféré par filtre garde son expéditeur d'origine (ex. no-reply@ontopo.com) : il est
 * accepté seulement si son domaine figure ici ET si l'authentification DMARC du domaine réussit.
 */
export const PLATFORM_DOMAINS = [
  "ontopo.com",
  "ontopo.co.il",
  "tabit.cloud",
  "tabitisrael.co.il",
  "booking.com",
  "airbnb.com",
  "opentable.com",
  "resy.com",
  "restu.cz",
] as const;

/** Le domaine de l'adresse est-il celui d'une plateforme, ou l'un de ses sous-domaines ? */
export function platformDomain(address: string | null): string | null {
  if (!address) return null;
  const domain = address.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  return PLATFORM_DOMAINS.find((d) => domain === d || domain.endsWith(`.${d}`)) ?? null;
}

/** Recherche Gmail du filtre : les emails de ces plateformes, et seulement eux. */
export function gmailFilterQuery(): string {
  return `from:(${PLATFORM_DOMAINS.join(" OR ")})`;
}

/** Liens Gmail du guide (compte par défaut du navigateur). */
export const GMAIL_LINKS = {
  forwarding: "https://mail.google.com/mail/u/0/#settings/fwdandpop",
  search: (query: string) => `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(query)}`,
} as const;

/** Expéditeur des codes de confirmation de transfert Gmail. */
export const GMAIL_FORWARDING_SENDER = "forwarding-noreply@google.com";

export type ForwardingConfirmation = { code: string; requester: string | null };

/**
 * Email « (#123456789) Gmail Forwarding Confirmation - Receive Mail from x@gmail.com » : le code est
 * dans l'objet quelle que soit la langue ; à défaut, dans le texte (« Confirmation code » / « Code de
 * confirmation »).
 */
export function parseGmailForwardingConfirmation(email: {
  from: string;
  subject: string | null;
  text: string;
}): ForwardingConfirmation | null {
  if (emailAddress(email.from) !== GMAIL_FORWARDING_SENDER) return null;
  const subject = email.subject ?? "";
  const code =
    /\(#(\d{6,12})\)/.exec(subject)?.[1] ??
    /(?:confirmation code|code de confirmation)\s*:?\s*(\d{6,12})/i.exec(email.text)?.[1] ??
    null;
  if (!code) return null;
  const requester = emailAddress(/\b(?:from|de)\s+(\S+@\S+)/i.exec(subject)?.[1] ?? email.text.split("\n")[0] ?? "");
  return { code, requester: requester && requester !== GMAIL_FORWARDING_SENDER ? requester : null };
}

/**
 * Domaines réservés aux tests (RFC 2606, RFC 6761) : aucun email ne peut y arriver. Une adresse de
 * transfert sur l'un d'eux ne doit jamais être proposée comme si elle fonctionnait.
 */
export function isReservedDomain(domain: string): boolean {
  return /(^|\.)(test|example|invalid|localhost|local)$/i.test(domain.trim()) || /(^|\.)example\.(com|net|org)$/i.test(domain.trim());
}
