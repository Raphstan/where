import { fold } from "./match";
import type { MemorySignal } from "./signal";

/**
 * Signaux contradictoires sur le bruit (maquette, Spicehaus) : un proche trouve le lieu calme,
 * un autre le dit bruyant. WHERE ne tranche pas : il donne les deux avis, et la nuance horaire
 * quand l'avis bruyant la précise (« après 22 h »).
 */
const CALM = /\b(calme|tranquille|tranquillement|on peut (encore )?parler|discuter|conversation|pas trop bruyant|pas bruyant)\b/;
const NOISY = /\b(bruyant|bruyante|bruit|musique forte|tres anime|dj)\b/;
const NOT_CALM = /\b(pas calme|pas tranquille|bruyant)\b/;
/** « avant 22 h » / « après 22 h » : un avis déjà nuancé ne contredit pas l'autre. */
const BEFORE = /\bavant (\d{1,2}) ?h\b/;
const AFTER = /\bapres (\d{1,2}) ?h\b/;

function textOf(s: MemorySignal): string {
  return fold([s.note ?? "", ...s.occasion].join(" · "));
}

function saysCalm(s: MemorySignal): boolean {
  const t = textOf(s);
  return CALM.test(t) && !NOT_CALM.test(t.replace(/pas trop bruyant|pas bruyant/g, "")) && !BEFORE.test(t);
}

function saysNoisy(s: MemorySignal): boolean {
  const t = textOf(s);
  return NOISY.test(t.replace(/pas trop bruyant|pas bruyant/g, ""));
}

export type Conflict = { calm: string; noisy: string; after: string | null };

/** Deux proches distincts, l'un « calme », l'autre « bruyant ». L'utilisateur lui-même n'est pas cité. */
export function noiseConflict(signals: readonly MemorySignal[]): Conflict | null {
  const members = signals.filter((s) => s.level !== "public" && s.author.kind === "member");
  for (const noisy of members.filter(saysNoisy)) {
    const calm = members.find((s) => saysCalm(s) && s.author.kind === "member" && noisy.author.kind === "member" && s.author.id !== noisy.author.id);
    if (calm && calm.author.kind === "member" && noisy.author.kind === "member") {
      const hour = AFTER.exec(textOf(noisy))?.[1] ?? null;
      return { calm: calm.author.name.trim(), noisy: noisy.author.name.trim(), after: hour ? `${hour} h` : null };
    }
  }
  return null;
}

/** Notice de la maquette : « Signaux contradictoires : Sarah le trouve calme, Noam indique… ». */
export function conflictNotice(c: Conflict): string {
  return c.after
    ? `Signaux contradictoires : ${c.calm} le trouve calme, ${c.noisy} indique qu’il devient bruyant après ${c.after}. Probablement calme en début de soirée, animé ensuite.`
    : `Signaux contradictoires : ${c.calm} le trouve calme, ${c.noisy} le trouve bruyant. Je te donne les deux avis plutôt que de trancher.`;
}

export const CONFLICT_CONFIDENCE = "Moyenne — signaux contradictoires";
