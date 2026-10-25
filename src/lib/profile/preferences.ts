import { fold } from "@/lib/search/match";

/** Ce que l'utilisateur a lui-même aimé : un lieu visité ou recommandé par lui, et ses occasions. */
export type OwnExperience = { placeId: string; vibe: readonly string[]; occasion: readonly string[] };

export const MAX_PREFERENCES = 7;

/**
 * « Mes préférences apprises » (maquette scrProfile) : les ambiances et occasions qui reviennent
 * dans les lieux que l'utilisateur a visités ou recommandés, de la plus fréquente à la moins
 * fréquente. Une déduction de WHERE à partir de ses propres données, jamais d'un proche.
 * Un mot compte une fois par lieu ; avec plusieurs lieux, un mot vu une seule fois ne suffit pas.
 */
export function learnedPreferences(experiences: readonly OwnExperience[], max = MAX_PREFERENCES): string[] {
  const byPlace = new Map<string, Set<string>>();
  const label = new Map<string, string>();
  for (const e of experiences) {
    const words = byPlace.get(e.placeId) ?? new Set<string>();
    for (const w of [...e.vibe, ...e.occasion]) {
      const k = fold(w);
      if (!k) continue;
      words.add(k);
      if (!label.has(k)) label.set(k, w.trim().toLocaleLowerCase("fr"));
    }
    byPlace.set(e.placeId, words);
  }
  const count = new Map<string, number>();
  for (const words of byPlace.values()) for (const k of words) count.set(k, (count.get(k) ?? 0) + 1);
  const min = byPlace.size > 1 ? 2 : 1;
  return [...count.entries()]
    .filter(([, n]) => n >= min)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr"))
    .slice(0, max)
    .map(([k]) => label.get(k)!);
}
