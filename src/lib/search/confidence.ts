import type { T } from "@/i18n/translator";
import { authorKey, distinctSignals, isPersonal, isStale, type MemorySignal } from "./signal";
import type { Confidence } from "./types";

/*
 * Textes des pastilles : messages/{langue}/search.json, `confidence.*` (en français, repris de la
 * maquette, PLACES[*].confTxt). Les nombres et prénoms sont les seules parties variables.
 */

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
export function computeConfidence(t: T, signals: readonly MemorySignal[], now: Date): Confidence {
  const distinct = distinctSignals(signals);
  const personal = distinct.filter(isPersonal);

  if (personal.length === 0) {
    return {
      level: "explo",
      text: distinct.length > 0 ? t("confidence.exploMostlyPublic") : t("confidence.exploPublicOnly"),
    };
  }

  const recos = personal.filter((s) => s.level === "recommended");
  const recentRecos = recos.filter((s) => !isStale(s, now));

  if (recentRecos.length === 0) {
    return {
      level: "moyenne",
      text: recos.length > 0 ? t("confidence.moyenneStaleReco") : t("confidence.moyenneMissingReco"),
    };
  }

  // Une même personne recommande et confirme y être allée (réponse invité « Oui » → recommended + visited).
  const visitors = new Set(personal.filter((s) => s.level === "visited").map((s) => authorKey(s.author)));
  if (recentRecos.some((s) => visitors.has(authorKey(s.author)))) {
    return { level: "forte", text: t("confidence.forteRecoAndVisit") };
  }

  if (personal.length >= 3) {
    return { level: "forte", text: t("confidence.forteSignals", { count: personal.length }) };
  }

  const recommenders = new Set(recentRecos.map((s) => authorKey(s.author)));
  if (recommenders.size >= 2) {
    return { level: "forte", text: t("confidence.forteRecos", { count: recommenders.size }) };
  }

  const [only] = recentRecos;
  if (only && only.author.kind === "member") {
    return { level: "forte", text: t("confidence.forteRecentReco", { name: only.author.name }) };
  }

  return { level: "forte", text: t("confidence.forteSignals", { count: personal.length }) };
}

/** Une découverte Google Places : aucun signal, uniquement de l'information publique. */
export function discoveryConfidence(t: T): Confidence {
  return { level: "explo", text: t("confidence.exploPublicOnly") };
}
