import type { Clarification } from "@/lib/ask/schema";
import type { RichText, SearchResult, SuggestedPerson } from "@/lib/search/types";

export type NoticeTone = "info" | "warn" | "coral" | "soft";

/**
 * Messages affichés dans la conversation. Même vocabulaire que la maquette
 * (user, typing, criteria, choice, where, notice, results, people, asked).
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
  | { id: number; kind: "asked"; names: string[] };

export const CRITERIA_HINT = "Ce que j’ai compris — touche un critère pour le retirer";
