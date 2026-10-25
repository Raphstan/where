import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/* ---------------------------------------------------------------------------
 * Signature du webhook (Resend signe avec Svix : svix-id, svix-timestamp, svix-signature)
 * ------------------------------------------------------------------------- */

/** Au-delà de cinq minutes, une requête signée est refusée (rejeu). */
export const SIGNATURE_TOLERANCE_S = 5 * 60;

export type SvixHeaders = { id: string | null; timestamp: string | null; signature: string | null };

/**
 * Vérifie la signature Svix sur le corps brut : HMAC-SHA256 de « {id}.{timestamp}.{corps} », clé =
 * secret « whsec_… » décodé en base64. L'en-tête peut porter plusieurs signatures « v1,… ».
 */
export function verifyWebhookSignature(
  rawBody: string,
  headers: SvixHeaders,
  secret: string | undefined,
  now = new Date(),
): boolean {
  if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false;
  const ts = Number(headers.timestamp);
  if (!Number.isInteger(ts) || Math.abs(now.getTime() / 1000 - ts) > SIGNATURE_TOLERANCE_S) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  if (key.length === 0) return false;
  const expected = createHmac("sha256", key).update(`${headers.id}.${headers.timestamp}.${rawBody}`).digest();

  return headers.signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/* ---------------------------------------------------------------------------
 * Événement email.received (le corps de l'email n'y figure pas)
 * ------------------------------------------------------------------------- */

export const WebhookEventSchema = z.object({
  type: z.string(),
  data: z.object({
    email_id: z.string().min(1).max(200),
    from: z.string().max(500),
    to: z.array(z.string().max(500)).max(100).default([]),
    cc: z.array(z.string().max(500)).max(100).default([]),
    received_for: z.array(z.string().max(500)).max(100).optional(),
    subject: z.string().max(2000).nullable().optional(),
    created_at: z.string().optional(),
  }),
});

export type WebhookEvent = z.infer<typeof WebhookEventSchema>;

/** « Raphaël <r@exemple.com> » → « r@exemple.com », en minuscules. */
export function emailAddress(value: string): string | null {
  const match = /<([^<>\s]+@[^<>\s]+)>/.exec(value) ?? /([^\s<>"]+@[^\s<>"]+)/.exec(value);
  return match ? match[1]!.toLowerCase() : null;
}

/**
 * Jeton de l'adresse de transfert : inbox+{jeton}@{domaine}. Cherché parmi tous les destinataires
 * (to, cc, received_for) ; seule une adresse de notre domaine compte.
 */
export function forwardToken(recipients: readonly string[], domain: string): string | null {
  const escaped = domain.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^inbox\\+([a-z0-9]{12,32})@${escaped}$`);
  for (const r of recipients) {
    const address = emailAddress(r);
    const m = address ? re.exec(address) : null;
    if (m) return m[1]!;
  }
  return null;
}

export function forwardAddress(token: string, domain: string): string {
  return `inbox+${token}@${domain}`;
}

/* ---------------------------------------------------------------------------
 * Contenu de l'email reçu : GET /emails/receiving/{id}
 * ------------------------------------------------------------------------- */

const AuthResult = z.string().nullable().optional();

export const ReceivedEmailSchema = z.object({
  id: z.string(),
  from: z.string(),
  subject: z.string().nullable().optional(),
  html: z.string().nullable().optional(),
  text: z.string().nullable().optional(),
  created_at: z.string().optional(),
  authentication: z
    .object({ spf: AuthResult, dkim: AuthResult, dmarc: AuthResult })
    .partial()
    .nullable()
    .optional(),
});

export type ReceivedEmail = z.infer<typeof ReceivedEmailSchema>;

export class ResendError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResendError";
  }
}

export async function fetchReceivedEmail(id: string, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<ReceivedEmail> {
  const res = await fetchImpl(`https://api.resend.com/emails/receiving/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (!res.ok) throw new ResendError(`Resend a répondu ${res.status}.`);
  const parsed = ReceivedEmailSchema.safeParse(await res.json().catch(() => null));
  if (!parsed.success) throw new ResendError("Réponse Resend inattendue.");
  return parsed.data;
}

/**
 * Expéditeur vérifié : l'email est transféré depuis l'adresse du compte, et Resend n'a pas vu
 * d'échec d'authentification (SPF, DKIM ou DMARC « fail ») — sinon n'importe qui pourrait écrire
 * dans la mémoire de quelqu'un en usurpant son adresse.
 */
export function isVerifiedSender(email: Pick<ReceivedEmail, "from" | "authentication">, accountEmail: string): boolean {
  if (emailAddress(email.from) !== accountEmail.toLowerCase()) return false;
  const auth = email.authentication;
  if (!auth) return true;
  return auth.dmarc !== "fail" && !(auth.spf === "fail" && auth.dkim === "fail");
}

/* ---------------------------------------------------------------------------
 * Texte brut
 * ------------------------------------------------------------------------- */

const ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'",
  eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", ccedil: "ç", ocirc: "ô", ucirc: "û", icirc: "î",
  rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", euro: "€", hellip: "…", ndash: "–", mdash: "—",
};

/** Texte lisible d'un email HTML : blocs en lignes, balises retirées, entités décodées. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6]|table|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#\d+|#x[0-9a-f]+|[a-z]+\d*);/gi, (all, name: string) => {
      const lower = name.toLowerCase();
      if (lower.startsWith("#x")) return String.fromCodePoint(parseInt(lower.slice(2), 16));
      if (lower.startsWith("#") && lower !== "#39") return String.fromCodePoint(Number(lower.slice(1)));
      return ENTITIES[lower] ?? all;
    })
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Le texte de l'email : la version texte si elle existe, sinon le HTML converti. */
export function emailText(email: Pick<ReceivedEmail, "text" | "html">): string {
  const text = email.text?.trim();
  if (text) return text;
  return email.html ? htmlToText(email.html) : "";
}
