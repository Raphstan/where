import type { Database } from "@/lib/supabase/database.types";

type SourceType = Database["public"]["Enums"]["signal_source_type"];

/** Interrupteurs « Utilisé pour les recommandations » (docs/prototype.html, scrPrivacy). */
export type UsagePrefs = {
  importedBookings: boolean;
  visitFeedback: boolean;
  circleReplies: boolean;
};

export const DEFAULT_USAGE: UsagePrefs = { importedBookings: true, visitFeedback: true, circleReplies: true };

/** Libellés mot pour mot, dans l'ordre de la maquette. */
export const USAGE_LABELS: readonly (readonly [keyof UsagePrefs, string])[] = [
  ["importedBookings", "Mes réservations importées"],
  ["visitFeedback", "Mes retours après visite"],
  ["circleReplies", "Les réponses de mon cercle (avec leur accord)"],
];

/** Colonnes de public.users correspondantes. */
export const USAGE_COLUMNS = {
  importedBookings: "use_imported_bookings",
  visitFeedback: "use_visit_feedback",
  circleReplies: "use_circle_replies",
} as const satisfies Record<keyof UsagePrefs, keyof Database["public"]["Tables"]["users"]["Row"]>;

/** Provenances d'un lieu importé par transfert d'email : la réservation et sa qualification. */
export const IMPORTED_SOURCES: readonly SourceType[] = ["email_forward", "qualification"];

/**
 * Un signal sert-il aux recommandations ? Un interrupteur coupé n'efface rien : le signal reste
 * dans la mémoire, il ne pèse plus dans les réponses.
 */
export function usableForRecommendations(
  signal: { sourceType: SourceType; fromMember: boolean },
  prefs: UsagePrefs,
): boolean {
  if (signal.fromMember) return prefs.circleReplies;
  if (IMPORTED_SOURCES.includes(signal.sourceType)) return prefs.importedBookings;
  if (signal.sourceType === "post_visit_feedback") return prefs.visitFeedback;
  return true;
}
