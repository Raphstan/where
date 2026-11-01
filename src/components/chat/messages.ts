import type { T } from "@/i18n/translator";
import type { Clarification } from "@/lib/ask/schema";
import type { BookedAnswer, DueFollowup } from "@/lib/booking/followup";
import type { RichText, SearchResult, SuggestedPerson } from "@/lib/search/types";

export type NoticeTone = "info" | "warn" | "orange" | "soft";

/**
 * Messages affichés dans la conversation. Même vocabulaire que la maquette
 * (user, typing, criteria, choice, where, notice, results, people, asked, feedback) ; `booked` est le
 * choix « As-tu réservé ? » posé au retour d'un lien sortant.
 * `search` regroupe les messages d'une même recherche, remplacés quand un critère change.
 */
export type ChatMessage =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "typing"; search?: number }
  | { id: number; kind: "criteria"; tags: string[] }
  | { id: number; kind: "choice"; clarification: Clarification; picked: string | null }
  | { id: number; kind: "where"; parts: RichText; search?: number }
  | { id: number; kind: "notice"; tone: NoticeTone; icon?: string; strong?: string; text: string; search?: number }
  | { id: number; kind: "results"; results: SearchResult[]; search: number }
  | { id: number; kind: "people"; people: SuggestedPerson[]; search: number }
  /** Aucun résultat : « Élargir les critères » retire le critère le plus précis (maquette, scénario « beach »). */
  | { id: number; kind: "widen"; search: number }
  | { id: number; kind: "asked"; names: string[] }
  | { id: number; kind: "booked"; result: SearchResult; picked: BookedAnswer | null }
  | { id: number; kind: "feedback"; followup: DueFollowup };

/**
 * « Suzana apparaît dans d’anciennes recommandations, mais semble désormais fermé. Je l’ai écarté. »
 * `t` : traducteur de l'espace `chat`.
 */
export function closedText(t: T, names: readonly string[]): { strong: string; text: string } {
  const strong = names.join(", ");
  return { strong, text: names.length > 1 ? t("closed.many") : t("closed.one") };
}
