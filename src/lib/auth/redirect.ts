/** Ne suit que des chemins internes : refuse les URL absolues et les « //evil ». */
export function safeNextPath(value: string | null | undefined, fallback = "/chat"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}

/**
 * Cookie qui garde la page demandée avant la connexion (« Commencer » → /onboarding, une question
 * posée depuis l'accueil…). Le lien magique arrive par email : on ne compte pas sur le template pour
 * transporter cette destination.
 */
export const NEXT_COOKIE = "where_next";
export const NEXT_COOKIE_MAX_AGE = 60 * 60;

/** Destination après le lien magique : celle de l'URL si elle est explicite, sinon celle du cookie. */
export function nextAfterLogin(fromQuery: string | null | undefined, fromCookie: string | null | undefined): string {
  const query = safeNextPath(fromQuery);
  return query !== "/chat" ? query : safeNextPath(fromCookie);
}
