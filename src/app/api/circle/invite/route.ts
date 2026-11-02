import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated, fail } from "@/lib/api";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { publicEnv } from "@/lib/env";
import { inviteText, replyLink, waMeUrl } from "@/lib/network/message";

export type InviteResponse = { link: string; text: string; waUrl: string; mailtoUrl: string };

const BodySchema = z.object({ name: z.string().trim().min(1).max(60).optional() }).default({});

/**
 * POST /api/circle/invite — « Inviter sur WhatsApp / par email », sur le modèle de Happenstance.
 * Crée un lien d'invitation (demande « adresses préférées », destinataire encore inconnu) et rend le
 * texte prêt à envoyer. Rien n'est envoyé par le serveur : l'utilisateur ouvre WhatsApp ou son
 * email, choisit le contact et appuie lui-même sur Envoyer (CLAUDE.md § 2.5).
 *
 * Le proche voit le prénom du demandeur en titre (« Raphaël aimerait… ») : sans prénom, pas de lien.
 * Le corps peut porter { name } pour le renseigner au passage ; sinon 409 name_required.
 */
export async function POST(request: Request) {
  const locale = await apiLocale();
  const t = translator(locale, "circle");
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", t("api.unauthenticated"));
  const { supabase, user } = auth;

  const parsed = BodySchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return fail(400, "invalid_request", t("api.checkFields"));
  const profile = await supabase.from("users").select("display_name").eq("id", user.id).maybeSingle();
  if (profile.error) return fail(503, "storage_unavailable", t("api.inviteFailed"));
  if (!profile.data?.display_name?.trim()) {
    if (!parsed.data.name) return fail(409, "name_required", t("api.nameRequired"));
    const saved = await supabase.from("users").update({ display_name: parsed.data.name }).eq("id", user.id);
    if (saved.error) return fail(503, "storage_unavailable", t("api.inviteFailed"));
  }

  const message = t("invite.message");
  const created = await supabase
    .from("requests")
    .insert({ user_id: user.id, kind: "invite", question: t("invite.question"), message })
    .select("id")
    .single();
  if (created.error) return fail(503, "storage_unavailable", t("api.inviteFailed"));

  const recipient = await supabase
    .from("request_recipients")
    .insert({ request_id: created.data.id, circle_member_id: null, sent_at: new Date().toISOString() })
    .select("token")
    .single();
  if (recipient.error) return fail(503, "storage_unavailable", t("api.inviteFailed"));

  const link = replyLink(publicEnv.NEXT_PUBLIC_SITE_URL, recipient.data.token);
  const text = inviteText(message, link);
  const body: InviteResponse = {
    link,
    text,
    waUrl: waMeUrl(null, text),
    mailtoUrl: `mailto:?subject=${encodeURIComponent(t("invite.subject"))}&body=${encodeURIComponent(text)}`,
  };
  return NextResponse.json(body, { status: 201 });
}
