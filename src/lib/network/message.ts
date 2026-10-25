import type { Criteria } from "@/lib/ask/schema";
import { kindCategories, type KindCategory } from "@/lib/search/match";

const KIND_PHRASE: Record<KindCategory, string> = {
  restaurant: "un restaurant",
  bar: "un bar",
  cafe: "un café",
  hotel: "un hôtel",
  beach: "une plage",
  activity: "une activité",
};

function placePhrase(placeKind: string | null): string {
  const cats = [...kindCategories(placeKind)];
  if (cats.length === 0) return "un bon endroit";
  return cats.map((c) => KIND_PHRASE[c]).join(" ou ");
}

/**
 * Message pré-rédigé, modifiable, sur le modèle de la maquette :
 * « Raphaël cherche un bon endroit pour déjeuner samedi à Zikhron Ya’akov … Tu as une recommandation ? »
 * À la troisième personne quand le prénom est connu, sinon à la première (« Je cherche »).
 */
export function draftMessage(criteria: Criteria, requesterName: string | null): string {
  const subject = requesterName?.trim() ? `${requesterName.trim()} cherche` : "Je cherche";
  const where = criteria.area && criteria.city
    ? ` à ${criteria.city} (${criteria.area})`
    : criteria.area || criteria.city
      ? ` à ${criteria.area ?? criteria.city}`
      : "";
  const when = criteria.when ? ` ${criteria.when}` : "";
  const extras = [criteria.occasion, ...criteria.vibe, ...criteria.constraints].filter(
    (v): v is string => Boolean(v && v.trim()),
  );
  const details = extras.length > 0 ? ` — ${extras.join(", ")}` : "";
  return `${subject} ${placePhrase(criteria.placeKind)}${where}${when}${details}. Tu as une recommandation ?`;
}

/** Lien privé de réponse : un par proche. */
export function replyLink(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/+$/, "")}/r/${token}`;
}

/** Texte envoyé sur WhatsApp : le message, puis le lien privé (maquette : « Répondre en 20 secondes »). */
export function whatsappText(message: string, link: string): string {
  return `${message.trim()}\n\n${link} · Répondre en 20 secondes`;
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
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
}

/**
 * Message du chat après l'ouverture de WhatsApp (maquette confirmSend) :
 * « Envoyé à Sarah, David et Maya sur WhatsApp. Je te préviens dès qu’ils répondent — rien d’autre
 * n’a été envoyé. » Au singulier : « dès qu’il ou elle répond ».
 */
export function askedText(names: readonly string[]): { strong: string; text: string } {
  return {
    strong: joinNames(names),
    text: ` sur WhatsApp. Je te préviens dès ${names.length > 1 ? "qu’ils répondent" : "qu’il ou elle répond"} — rien d’autre n’a été envoyé.`,
  };
}
