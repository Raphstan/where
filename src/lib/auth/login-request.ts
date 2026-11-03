import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Locale } from "@/i18n/routing";
import { translator } from "@/i18n/translator";
import { publicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginEmailHtml } from "./login-email";
import { LOGIN_SENDER } from "./mailbox";

/*
 * Connexion par email sans recopier de code (migration 20261103080000_login_requests).
 * 1. La page de connexion crée une demande : un secret part dans un cookie de CE navigateur, un autre
 *    dans le lien de l'email. Le même email porte aussi le code à 6 chiffres (secours, autre appareil).
 * 2. Le lien, ouvert n'importe où (navigateur de Gmail), approuve la demande sur un geste explicite :
 *    jamais sur un simple GET, que les antivirus de messagerie ouvrent tout seuls.
 * 3. La page d'origine, qui interroge le serveur, trouve la demande approuvée et se connecte.
 * Usage service_role restreint à la table login_requests et à auth.admin.generateLink.
 */

export const LOGIN_REQUEST_COOKIE = "wh3re_login";
export const LOGIN_REQUEST_TTL_S = 15 * 60;
/** Une demande par email et par minute au plus, comme la limite de Supabase qu'on contourne ici. */
const MIN_INTERVAL_MS = 60 * 1000;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
const secret = () => randomBytes(32).toString("base64url");

function sameHash(value: string, hash: string): boolean {
  const a = Buffer.from(sha256(value), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Valeur du cookie : « {id}.{secret} ». */
export function parseLoginCookie(value: string | undefined): { id: string; secret: string } | null {
  const match = /^([0-9a-f-]{36})\.([A-Za-z0-9_-]{43})$/.exec(value ?? "");
  return match ? { id: match[1], secret: match[2] } : null;
}

export type StartResult =
  | { status: "sent"; cookie: string }
  | { status: "tooSoon" }
  /** Pas de clé d'envoi Resend : l'appelant repasse par l'envoi de Supabase (lien + code). */
  | { status: "unavailable" };

export async function startLoginRequest(email: string, next: string | null, locale: Locale): Promise<StartResult> {
  const env = getServerEnv();
  const sendKey = env.RESEND_SEND_API_KEY;
  const devLog = !sendKey && process.env.NODE_ENV !== "production";
  if (!sendKey && !devLog) return { status: "unavailable" };

  const admin = createAdminClient();
  const recent = await admin
    .from("login_requests")
    .select("created_at")
    .eq("email", email)
    .gt("created_at", new Date(Date.now() - MIN_INTERVAL_MS).toISOString())
    .limit(1);
  if (recent.error) throw new Error(recent.error.message);
  if (recent.data.length > 0) return { status: "tooSoon" };

  // Le compte existe déjà (ensureBetaAccount) : generateLink ne crée personne et n'envoie rien.
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error || !link.data.properties) throw new Error(link.error?.message ?? "generateLink");
  const { hashed_token: tokenHash, email_otp: code } = link.data.properties;

  const browserSecret = secret();
  const approveSecret = secret();
  const inserted = await admin
    .from("login_requests")
    .insert({
      email,
      token_hash: tokenHash,
      browser_secret_hash: sha256(browserSecret),
      approve_secret_hash: sha256(approveSecret),
      next_path: next,
      expires_at: new Date(Date.now() + LOGIN_REQUEST_TTL_S * 1000).toISOString(),
    })
    .select("id")
    .single();
  if (inserted.error) throw new Error(inserted.error.message);
  const id = inserted.data.id;

  // Ménage : les demandes de plus d'un jour ne servent plus à rien.
  await admin.from("login_requests").delete().lt("created_at", new Date(Date.now() - 86_400_000).toISOString());

  const approveUrl = new URL("/login/approve", publicEnv.NEXT_PUBLIC_SITE_URL);
  approveUrl.searchParams.set("r", id);
  approveUrl.searchParams.set("s", approveSecret);

  const t = translator(locale, "login");
  if (devLog) {
    console.info(`[login] ${email} · code ${code} · ${approveUrl.toString()}`);
  } else {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${sendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `WH3RE <${LOGIN_SENDER}>`,
        to: [email],
        subject: t("email.subject", { code }),
        html: loginEmailHtml({ locale, code, url: approveUrl.toString(), t }),
        text: t("email.text", { code, url: approveUrl.toString() }),
      }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
  }
  return { status: "sent", cookie: `${id}.${browserSecret}` };
}

type Row = { id: string; token_hash: string; next_path: string | null; browser_secret_hash: string; approve_secret_hash: string };

async function liveRequest(id: string): Promise<Row | null> {
  const { data, error } = await createAdminClient()
    .from("login_requests")
    .select("id, token_hash, next_path, browser_secret_hash, approve_secret_hash")
    .eq("id", id)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Ce navigateur est-il celui qui a fait la demande ? (lien ouvert là où l'email a été tapé) */
export async function isRequestingBrowser(id: string, cookie: string | undefined): Promise<boolean> {
  const parsed = parseLoginCookie(cookie);
  if (!parsed || parsed.id !== id) return false;
  const row = await liveRequest(id);
  return !!row && sameHash(parsed.secret, row.browser_secret_hash);
}

/** Clic sur « C'est moi » depuis l'email : la page d'origine pourra se connecter. */
export async function approveLoginRequest(id: string, approveSecret: string): Promise<boolean> {
  const row = await liveRequest(id);
  if (!row || !sameHash(approveSecret, row.approve_secret_hash)) return false;
  const { error } = await createAdminClient()
    .from("login_requests")
    .update({ approved_at: new Date().toISOString() })
    .eq("id", id)
    .is("approved_at", null);
  return !error;
}

/**
 * Remet le jeton de connexion, une seule fois : au navigateur d'origine une fois la demande approuvée
 * (`by: "browser"`), ou au navigateur du lien s'il veut se connecter lui-même (`by: "approval"`).
 */
export async function consumeLoginRequest(
  id: string,
  value: string,
  by: "browser" | "approval",
): Promise<{ tokenHash: string; next: string | null } | null> {
  const row = await liveRequest(id);
  if (!row) return null;
  if (!sameHash(value, by === "browser" ? row.browser_secret_hash : row.approve_secret_hash)) return null;
  let update = createAdminClient()
    .from("login_requests")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", id)
    .is("consumed_at", null);
  if (by === "browser") update = update.not("approved_at", "is", null);
  const { data, error } = await update.select("id");
  if (error || !data?.length) return null;
  return { tokenHash: row.token_hash, next: row.next_path };
}

/** Le lien de l'email est-il encore utilisable ? (page « C'est bien toi ? ») */
export async function isLiveApproveLink(id: string, approveSecret: string): Promise<boolean> {
  const row = await liveRequest(id);
  return !!row && sameHash(approveSecret, row.approve_secret_hash);
}
