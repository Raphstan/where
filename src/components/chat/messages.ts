import type { Clarification } from "@/lib/ask/schema";

/** Messages affichés dans la conversation. Même vocabulaire que la maquette (user, typing, criteria, choice, where, notice). */
export type ChatMessage =
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "typing" }
  | { id: number; kind: "criteria"; tags: string[] }
  | { id: number; kind: "choice"; clarification: Clarification; picked: string | null }
  | { id: number; kind: "where"; text: string }
  | { id: number; kind: "notice"; tone: "info" | "warn"; text: string };

export const CRITERIA_HINT = "Ce que j’ai compris — touche un critère pour le retirer";
export const ENDING_TEXT =
  "C’est ce que j’ai compris. La recherche dans ton cercle arrive à la prochaine étape.";
