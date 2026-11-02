import "server-only";

/**
 * Budget Google Places : la facture doit rester à 0 (décision du 2026-11-02).
 *
 * Google offre chaque mois une part gratuite par type d'appel (SKU) : 10 000 pour les SKU
 * « Essentials » (dont Autocomplete Requests), 5 000 pour « Pro », 1 000 pour « Enterprise ».
 * Chaque appel passe par googleFetch, qui le compte (usage_counters, par mois UTC). Au plafond,
 * l'appli n'appelle plus Google jusqu'au 1er du mois suivant : la page invité garde la saisie
 * libre, la recherche garde la mémoire et le cercle.
 *
 * Plafonds pris sous le palier le plus bas possible pour chaque SKU, avec une marge de 10 %.
 * La recherche texte demande la note et le nombre d'avis (« Enterprise ») : 900.
 */
export const GOOGLE_BUDGET = {
  autocomplete: 9_000,
  text_search: 900,
  place_details: 900,
} as const;

export type GoogleSku = keyof typeof GOOGLE_BUDGET;

/** Type d'appel d'après l'adresse de Places API (New) ; null pour une adresse qui n'est pas Google Places. */
export function skuForUrl(url: string): GoogleSku | null {
  if (!url.startsWith("https://places.googleapis.com/")) return null;
  if (url.includes("places:autocomplete")) return "autocomplete";
  if (url.includes("places:searchText")) return "text_search";
  if (/\/v1\/places\/[^/:]+$/.test(url.split("?")[0] ?? "")) return "place_details";
  // Tout autre appel Google Places (nearby, photos…) est refusé : il n'est pas budgété.
  return null;
}

/**
 * Consomme une unité du budget du mois. En cas d'erreur de la base, on refuse : sans compteur,
 * on ne peut pas garantir la gratuité.
 */
export async function consumeGoogleBudget(sku: GoogleSku): Promise<boolean> {
  try {
    // Import différé : les modules qui appellent Google restent testables sans variables Supabase.
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { data, error } = await createAdminClient().rpc("consume_google_budget", { p_sku: sku, p_limit: GOOGLE_BUDGET[sku] });
    if (error) {
      console.error(`[google-budget] ${sku}`, error.message);
      return false;
    }
    if (data !== true) console.warn(`[google-budget] plafond du mois atteint : ${sku}`);
    return data === true;
  } catch (error) {
    console.error(`[google-budget] ${sku}`, error instanceof Error ? error.message : error);
    return false;
  }
}

/** Réponse rendue à la place de Google quand le budget est épuisé (traitée comme une erreur). */
function budgetExhausted(): Response {
  return new Response(JSON.stringify({ error: { status: "WH3RE_BUDGET_EXHAUSTED" } }), {
    status: 429,
    headers: { "content-type": "application/json" },
  });
}

/**
 * fetch pour Google Places : chaque appel est compté avant de partir. Seul point de sortie vers
 * Google dans l'appli (les fonctions de src/lib/search/google-places.ts l'utilisent par défaut).
 */
export async function googleFetch(input: string, init: RequestInit): Promise<Response> {
  if (input.startsWith("https://places.googleapis.com/")) {
    const sku = skuForUrl(input);
    if (!sku || !(await consumeGoogleBudget(sku))) return budgetExhausted();
  }
  return fetch(input, init);
}
