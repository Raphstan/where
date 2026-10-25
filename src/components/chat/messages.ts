import type { Clarification } from "@/lib/ask/schema";
import type { RichText, SearchResult } from "@/lib/search/types";

/**
 * Messages affichés dans la conversation. Même vocabulaire que la maquette
 * (user, typing, criteria, choice, where, notice, results).
 * `search` regroupe les messages d'une même recherche, remplacés quand un critère change.
 */
export type ChatMessage =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "typing"; search?: number }
  | { id: number; kind: "criteria"; tags: string[] }
  | { id: number; kind: "choice"; clarification: Clarification; picked: string | null }
  | { id: number; kind: "where"; parts: RichText; search?: number }
  | { id: number; kind: "notice"; tone: "info" | "warn"; icon?: string; text: string; search?: number }
  | { id: number; kind: "results"; results: SearchResult[]; search: number };

export const CRITERIA_HINT = "Ce que j’ai compris — touche un critère pour le retirer";
