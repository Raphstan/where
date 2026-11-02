import type { T } from "@/i18n/translator";
import type { Criteria } from "@/lib/ask/schema";
import { kindCategories } from "@/lib/search/match";

/*
 * Textes : messages/{langue}/network.json. `t` : traducteur de l'espace `network`, dans la langue
 * du DEMANDEUR (c'est lui qui envoie le message, même si le proche parle une autre langue).
 */

function placePhrase(t: T, placeKind: string | null): string {
  const cats = [...kindCategories(placeKind)];
  if (cats.length === 0) return t("draft.kinds.any");
  return cats.map((c) => t(`draft.kinds.${c}`)).reduce((a, b) => t("draft.or", { a, b }));
}

/**
 * Message pré-rédigé, modifiable, sur le modèle de la maquette :
 * « Raphaël cherche un bon endroit pour déjeuner samedi à Zikhron Ya’akov … Tu as une recommandation ? »
 * À la troisième personne quand le prénom est connu, sinon à la première (« Je cherche »).
 * Les critères (moment, ambiance…) sont repris tels que le modèle les a compris.
 */
export function draftMessage(t: T, criteria: Criteria, requesterName: string | null): string {
  const where = criteria.area && criteria.city
    ? t("draft.whereCityArea", { city: criteria.city, area: criteria.area })
    : criteria.area || criteria.city
      ? t("draft.where", { place: (criteria.area ?? criteria.city)! })
      : "";
  const when = criteria.when ? ` ${criteria.when}` : "";
  const extras = [criteria.occasion, ...criteria.vibe, ...criteria.constraints].filter(
    (v): v is string => Boolean(v && v.trim()),
  );
  const details = extras.length > 0 ? t("draft.details", { list: extras.join(", ") }) : "";
  const values = { what: placePhrase(t, criteria.placeKind), where, when, details };
  const name = requesterName?.trim();
  return name ? t("draft.withName", { name, ...values }) : t("draft.anonymous", values);
}

/** Lien privé de réponse : un par proche. */
export function replyLink(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/r/${token}`;
}

/** Texte envoyé sur WhatsApp : le message, puis le lien privé (maquette : « Répondre en 20 secondes »). */
export function whatsappText(t: T, message: string, link: string): string {
  return `${message.trim()}\n\n${link} · ${t("replyIn20")}`;
}

/** Texte d'une invitation (« tes adresses préférées ») : le message, puis le lien sur sa propre ligne. */
export function inviteText(message: string, link: string): string {
  return `${message.trim()}\n${link}`;
}

/**
 * Lien wa.me pré-rempli. Le numéro doit être au format international ; sans numéro exploitable,
 * WhatsApp laisse l'utilisateur choisir le contact. Rien n'est envoyé : l'utilisateur ouvre le lien
 * et appuie lui-même sur Envoyer.
 */
export function waMeUrl(phone: string | null, text: string): string {
  const digits = (phone ?? "").replace(/\D/g, "").replace(/^00/, "");
  const base = digits.length >= 8 ? `https://wa.me/${digits}` : "https://wa.me/";
  return `${base}?text=${encodeURIComponent(text)}`;
}

/** « Sarah », « Sarah et David », « Sarah, David et Maya » (maquette : « Envoyer à Sarah, David et Maya ? »). */
export function joinNames(t: T, names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return t("names.and", { rest: names.slice(0, -1).join(", "), last: names.at(-1)! });
}

/**
 * Message du chat après l'ouverture de WhatsApp (maquette confirmSend) :
 * « Envoyé à Sarah, David et Maya sur WhatsApp. Je te préviens dès qu’ils répondent — rien d’autre
 * n’a été envoyé. » Au singulier : « dès qu’il ou elle répond ». Les prénoms (`strong`) sont en gras,
 * entre `before` et `text`.
 */
const MARK = "\uE000";
export function askedText(t: T, names: readonly string[]): { before: string; strong: string; text: string } {
  const [before = "", text = ""] = t(names.length > 1 ? "asked.many" : "asked.one", { names: MARK }).split(MARK);
  return { before, strong: joinNames(t, names), text };
}
