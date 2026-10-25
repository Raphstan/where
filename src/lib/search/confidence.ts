import { authorKey, distinctSignals, isPersonal, isStale, type MemorySignal } from "./signal";
import type { Confidence } from "./types";

/**
 * Textes des pastilles de confiance, repris de la maquette (PLACES[*].confTxt).
 * Les nombres et prénoms sont les seules parties variables.
 */
export const CONFIDENCE_TEXT = {
  forteRecoAndVisit: "Forte — recommandation explicite et visite confirmée",
  forteSignals: (n: number) => `Forte — basée sur ${n} ${n > 1 ? "signaux personnels" : "signal personnel"}`,
  forteRecos: (n: number) => `Forte — ${n} recommandations`,
  forteRecentReco: (name: string) => `Forte — recommandation récente de ${name}`,
  moyenneMissingReco: "Moyenne — une recommandation personnelle manque",
  moyenneStaleReco: "Moyenne — recommandation ancienne",
  exploMostlyPublic: "Exploratoire — principalement basé sur des données publiques",
  exploPublicOnly: "Exploratoire — informations publiques uniquement",
} as const;

/** Rang d'affichage : forte d'abord, exploratoire en dernier. */
export const CONFIDENCE_ORDER = { forte: 0, moyenne: 1, explo: 2 } as const;

/**
 * Niveau de confiance d'un lieu à partir de ses signaux (règles de la maquette) :
 *
 * - **Forte** : au moins une recommandation explicite récente (moins de deux ans).
 * - **Moyenne** : des signaux personnels, mais pas de recommandation récente : soit aucune
 *   recommandation (« une recommandation personnelle manque »), soit seulement d'anciennes.
 * - **Exploratoire** : aucun signal personnel, uniquement de l'information publique.
 *
 * Le texte de la pastille explique le niveau, du plus parlant au plus général.
 */
export function computeConfidence(signals: readonly MemorySignal[], now: Date): Confidence {
  const distinct = distinctSignals(signals);
  const personal = distinct.filter(isPersonal);

  if (personal.length === 0) {
    return {
      level: "explo",
      text: distinct.length > 0 ? CONFIDENCE_TEXT.exploMostlyPublic : CONFIDENCE_TEXT.exploPublicOnly,
    };
  }

  const recos = personal.filter((s) => s.level === "recommended");
  const recentRecos = recos.filter((s) => !isStale(s, now));

  if (recentRecos.length === 0) {
    return {
      level: "moyenne",
      text: recos.length > 0 ? CONFIDENCE_TEXT.moyenneStaleReco : CONFIDENCE_TEXT.moyenneMissingReco,
    };
  }

  // Une même personne recommande et confirme y être allée (réponse invité « Oui » → recommended + visited).
  const visitors = new Set(personal.filter((s) => s.level === "visited").map((s) => authorKey(s.author)));
  if (recentRecos.some((s) => visitors.has(authorKey(s.author)))) {
    return { level: "forte", text: CONFIDENCE_TEXT.forteRecoAndVisit };
  }

  if (personal.length >= 3) {
    return { level: "forte", text: CONFIDENCE_TEXT.forteSignals(personal.length) };
  }

  const recommenders = new Set(recentRecos.map((s) => authorKey(s.author)));
  if (recommenders.size >= 2) {
    return { level: "forte", text: CONFIDENCE_TEXT.forteRecos(recommenders.size) };
  }

  const [only] = recentRecos;
  if (only && only.author.kind === "member") {
    return { level: "forte", text: CONFIDENCE_TEXT.forteRecentReco(only.author.name) };
  }

  return { level: "forte", text: CONFIDENCE_TEXT.forteSignals(personal.length) };
}

/** Une découverte Google Places : aucun signal, uniquement de l'information publique. */
export function discoveryConfidence(): Confidence {
  return { level: "explo", text: CONFIDENCE_TEXT.exploPublicOnly };
}
