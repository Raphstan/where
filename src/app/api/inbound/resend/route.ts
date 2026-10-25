import { NextResponse, type NextRequest } from "next/server";
import { fail } from "@/lib/api";
import { getServerEnv } from "@/lib/env.server";
import { classifyEmail } from "@/lib/inbound/classify";
import { mockClassify } from "@/lib/inbound/mock";
import {
  emailAddress,
  emailText,
  fetchReceivedEmail,
  forwardToken,
  isAuthenticatedFrom,
  isVerifiedSender,
  verifyWebhookSignature,
  WebhookEventSchema,
} from "@/lib/inbound/resend";
import { GMAIL_FORWARDING_SENDER, parseGmailForwardingConfirmation, platformDomain } from "@/lib/inbound/platforms";
import { alreadyReceived, findForwardOwner, ingestEmail, saveGmailConfirmation } from "@/lib/inbound/store";
import { createAdminClient } from "@/lib/supabase/admin";

/** Ignoré sans erreur : Resend ne rejoue pas un 2xx. */
function ignored(reason: string) {
  return NextResponse.json({ ignored: reason });
}

/**
 * POST /api/inbound/resend — webhook Resend « email.received » (réception, voir README).
 * 1. Signature Svix vérifiée sur le corps brut (RESEND_WEBHOOK_SECRET).
 * 2. Le destinataire inbox+{jeton}@WHERE_INBOUND_DOMAIN désigne le compte ; l'expéditeur doit être
 *    l'adresse de ce compte (transfert à la main), ou une plateforme de réservation authentifiée par
 *    DMARC (transfert par filtre Gmail). Le code de confirmation de transfert envoyé par Gmail est
 *    gardé pour être affiché à l'utilisateur, qui le recopie lui-même.
 * 3. Le contenu est lu chez Resend, classé par l'API Anthropic, puis enregistré en attente de
 *    qualification (réservation) ou écarté (livraison, annulation, autre). Aucun signal n'est créé ici.
 * Usage de service_role : la requête vient de Resend, sans session utilisateur.
 * Une erreur transitoire (Resend, Anthropic, base) répond 503 : Resend rejoue l'événement.
 */
export async function POST(request: NextRequest) {
  const env = getServerEnv();
  const raw = await request.text();
  const signed = verifyWebhookSignature(
    raw,
    {
      id: request.headers.get("svix-id"),
      timestamp: request.headers.get("svix-timestamp"),
      signature: request.headers.get("svix-signature"),
    },
    env.RESEND_WEBHOOK_SECRET,
  );
  if (!signed) return fail(401, "invalid_signature", "Signature invalide.");

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail(400, "invalid_request", "Événement illisible.");
  }
  const event = WebhookEventSchema.safeParse(json);
  if (!event.success) return fail(400, "invalid_request", "Événement inattendu.");
  if (event.data.type !== "email.received") return ignored("event_type");

  if (!env.WHERE_INBOUND_DOMAIN || !env.RESEND_API_KEY) {
    return fail(503, "not_configured", "Réception des emails non configurée.");
  }
  const { data } = event.data;
  const token = forwardToken([...data.to, ...data.cc, ...(data.received_for ?? [])], env.WHERE_INBOUND_DOMAIN);
  if (!token) return ignored("unknown_address");

  try {
    const admin = createAdminClient();
    const owner = await findForwardOwner(admin, token);
    if (!owner) return ignored("unknown_address");
    if (await alreadyReceived(admin, data.email_id)) return ignored("duplicate");

    const email = await fetchReceivedEmail(data.email_id, env.RESEND_API_KEY);
    const text = emailText(email);
    const subject = email.subject ?? data.subject ?? null;

    // Gmail demande à confirmer le transfert : on garde le code, on ne confirme rien soi-même.
    if (isAuthenticatedFrom(email, GMAIL_FORWARDING_SENDER)) {
      const confirmation = parseGmailForwardingConfirmation({ from: email.from, subject, text });
      if (!confirmation) return ignored("gmail_unrecognized");
      await saveGmailConfirmation(admin, owner.userId, confirmation);
      return NextResponse.json({ gmailConfirmation: true });
    }

    if (!isVerifiedSender(email, owner.email, (a) => platformDomain(a) !== null)) return ignored("unverified_sender");

    if (!text && !subject) return ignored("empty");

    const classification =
      env.WHERE_ASK_MOCK && process.env.NODE_ENV !== "production"
        ? mockClassify({ subject, text })
        : await classifyEmail({ subject, text });

    const result = await ingestEmail(admin, {
      userId: owner.userId,
      resendEmailId: data.email_id,
      fromAddress: emailAddress(email.from) ?? owner.email,
      subject,
      text,
      receivedAt: email.created_at ?? data.created_at ?? new Date().toISOString(),
      classification,
    });
    return result.outcome === "duplicate"
      ? ignored("duplicate")
      : NextResponse.json({ kind: result.kind, status: result.status, cancelled: result.cancelled });
  } catch (error) {
    console.error("[inbound] échec du traitement", error instanceof Error ? error.message : error);
    return fail(503, "unavailable", "Traitement impossible pour l’instant.");
  }
}
