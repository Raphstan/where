import { EVIDENCE_LABEL_LONG, type EvidenceLevel } from "@/lib/evidence";
import { fold } from "./match";
import { ageInYears, isStale, type MemorySignal } from "./signal";
import type { EvidenceLine, Person, RichText, SearchResult } from "./types";

/** Libellé des déductions de WHERE, mot pour mot (maquette EVLABEL.pref). Jamais attribué à un proche. */
export const DEDUCTION_LABEL = "Tes préférences / déduction WHERE";

/** Rappel des niveaux de preuve dans « Pourquoi ce choix ? », mot pour mot (maquette whyBody). */
export const EVIDENCE_REMINDER: readonly { level: EvidenceLevel; label: string }[] = [
  { level: "recommended", label: "Recommandé explicitement" },
  { level: "visited", label: "Visité et confirmé" },
  { level: "booked", label: "Réservation confirmée / signal post-visite" },
  { level: "saved", label: "Sauvegardé ou partagé" },
  { level: "public", label: "Information publique uniquement" },
];

/** Provenances autorisées (CLAUDE.md § 2.3). */
export const PROVENANCE = {
  circle: "de ton cercle",
  booking: "d’une réservation",
  share: "d’un partage",
  web: "du web public",
  mine: "de tes données",
} as const;

export function provenanceFor(level: EvidenceLevel, fromCircle: boolean): string {
  switch (level) {
    case "recommended":
    case "visited":
      return fromCircle ? PROVENANCE.circle : PROVENANCE.mine;
    case "booked_confirmed":
    case "booked":
      return PROVENANCE.booking;
    case "saved":
      return PROVENANCE.share;
    case "public":
      return PROVENANCE.web;
  }
}

const NUMBER_WORDS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];

/** « trois » pour 3, comme la maquette ; au-delà de dix, en chiffres. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « en juin » la même année, « en 2025 » sinon (maquette : « David y a réservé en juin »). */
export function whenPhrase(date: Date, now: Date): string {
  return date.getUTCFullYear() === now.getUTCFullYear()
    ? `en ${MONTHS[date.getUTCMonth()]}`
    : `en ${date.getUTCFullYear()}`;
}

const OCCASION_PHRASES: Record<string, string> = {
  date: "pour un date",
  amis: "entre amis",
  groupe: "pour les groupes",
  famille: "en famille",
  business: "pour un repas d’affaires",
  calme: "pour le calme",
  fete: "pour faire la fête",
  "occasion speciale": "pour une occasion spéciale",
  dejeuner: "pour un déjeuner",
  touristes: "pour des touristes",
  travail: "pour travailler",
  "pour travailler": "pour travailler",
  "sejour a deux": "pour un séjour à deux",
};

export function occasionPhrase(occasion: string): string {
  return OCCASION_PHRASES[fold(occasion)] ?? `pour « ${occasion} »`;
}

/** L'occasion du signal qui correspond à la recherche, sinon la première. */
export function pickOccasion(signal: Pick<MemorySignal, "occasion">, wanted: string | null): string | null {
  if (wanted) {
    const hit = signal.occasion.find((o) => fold(o) === fold(wanted));
    if (hit) return hit;
  }
  return signal.occasion[0] ?? null;
}

const NOTE_MAX = 140;

function quote(note: string): string {
  const n = note.trim().replace(/\s+/g, " ");
  return `« ${n.length > NOTE_MAX ? `${n.slice(0, NOTE_MAX - 1).trimEnd()}…` : n} »`;
}

export function personOf(signal: MemorySignal): Person | null {
  if (signal.author.kind !== "member") return null;
  const name = signal.author.name.trim();
  return { id: signal.author.id, name, initial: name.charAt(0).toLocaleUpperCase("fr") };
}

/**
 * Phrase libre d'une ligne de preuve. Elle ne dit jamais plus que le signal :
 * une réservation reste une réservation, jamais une visite.
 */
export function signalSentence(signal: MemorySignal, now: Date, wantedOccasion: string | null): string | null {
  const member = signal.author.kind === "member" ? signal.author.name.trim() : null;
  const occ = pickOccasion(signal, wantedOccasion);
  const note = signal.note?.trim() ? quote(signal.note) : null;

  switch (signal.level) {
    case "recommended": {
      const year = signal.createdAt.getUTCFullYear();
      const base = isStale(signal, now)
        ? member
          ? `${member} l’a recommandé en ${year}`
          : `Tu l’as recommandé en ${year}`
        : member
          ? `${member} le recommande${occ ? ` ${occasionPhrase(occ)}` : ""}`
          : `Tu le recommandes${occ ? ` ${occasionPhrase(occ)}` : ""}`;
      return note ? `${base} : ${note}` : base;
    }
    case "visited":
      if (member) return note ? `${member} : ${note}` : `Visite confirmée par ${member}`;
      return note ? `Ta note : ${note}` : "Ta visite est confirmée";
    case "booked_confirmed":
    case "booked":
      return member
        ? `${member} y a réservé ${whenPhrase(signal.createdAt, now)}`
        : `Tu y as réservé ${whenPhrase(signal.createdAt, now)}`;
    case "saved":
      return member ? `${member} l’a enregistré` : "Tu l’as enregistré";
    case "public":
      return note;
  }
}

export function evidenceLine(signal: MemorySignal, now: Date, wantedOccasion: string | null): EvidenceLine | null {
  const text = signalSentence(signal, now, wantedOccasion);
  if (!text) return null;
  const person = signal.level === "public" ? null : personOf(signal);
  return {
    kind: "evidence",
    level: signal.level,
    text,
    label: EVIDENCE_LABEL_LONG[signal.level],
    provenance: provenanceFor(signal.level, person !== null),
    person,
  };
}

/** Déduction de WHERE : ce qui, dans la fiche du lieu, correspond à la demande. */
export function deductionLine(matches: readonly string[]): EvidenceLine | null {
  if (matches.length === 0) return null;
  return {
    kind: "deduction",
    text: `Correspond à tes critères : ${matches.join(", ")}`,
    label: DEDUCTION_LABEL,
    provenance: PROVENANCE.mine,
    person: null,
  };
}

/** Phrases de la maquette pour la découverte publique. */
export const DISCOVERY_TEXT = {
  headline: "Une découverte, pas encore validée par ton cercle",
  noCircle: "Aucun proche ne l’a encore recommandé",
  outsideCircle: "Hors de ton cercle",
  unknownPersonal: "Aucun signal personnel",
  unknownVibe: "Ambiance réelle non confirmée",
} as const;

export const BEST_MATCH_HEADLINE = "Le meilleur match pour ta demande";

export function ratingLine(rating: number, count: number | null): EvidenceLine {
  const r = rating.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const n = count ? ` (${count.toLocaleString("fr-FR")} avis Google)` : "";
  return {
    kind: "evidence",
    level: "public",
    text: `Note publique de ${r} sur 5${n}`,
    label: EVIDENCE_LABEL_LONG.public,
    provenance: PROVENANCE.web,
    person: null,
  };
}

export function noCircleLine(): EvidenceLine {
  return {
    kind: "evidence",
    level: "public",
    text: DISCOVERY_TEXT.noCircle,
    label: EVIDENCE_LABEL_LONG.public,
    provenance: PROVENANCE.web,
    person: null,
  };
}

export const UNKNOWN_TEXT = {
  noVisit: "Aucune visite confirmée dans ton cercle",
  noSecondOpinion: "Aucun second avis dans ton cercle",
  noRecentSignal: "Aucun signal récent dans ton cercle",
  vibe: (v: string) => `« ${v} » : non confirmé`,
  availability: (when: string) => `Disponibilité ${when} non vérifiée`,
} as const;

export const MAX_UNKNOWNS = 4;

/** « Ce que nous ne savons pas encore » pour un lieu de la mémoire : les trous réels des preuves. */
export function personalUnknowns(
  signals: readonly MemorySignal[],
  unmatchedVibes: readonly string[],
  when: string | null,
  now: Date,
): string[] {
  const personal = signals.filter((s) => s.level !== "public");
  const out: string[] = [];
  if (!personal.some((s) => s.level === "visited")) out.push(UNKNOWN_TEXT.noVisit);
  const authors = new Set(personal.map((s) => (s.author.kind === "self" ? "self" : s.author.id)));
  if (authors.size === 1 && personal[0]?.author.kind === "member") out.push(UNKNOWN_TEXT.noSecondOpinion);
  if (personal.length > 0 && personal.every((s) => isStale(s, now))) out.push(UNKNOWN_TEXT.noRecentSignal);
  for (const v of unmatchedVibes) out.push(UNKNOWN_TEXT.vibe(v));
  if (when) out.push(UNKNOWN_TEXT.availability(when));
  return out.slice(0, MAX_UNKNOWNS);
}

export function discoveryUnknowns(when: string | null): string[] {
  const out: string[] = [DISCOVERY_TEXT.unknownPersonal, DISCOVERY_TEXT.unknownVibe];
  if (when) out.push(UNKNOWN_TEXT.availability(when));
  return out;
}

/** Notice d'ancienneté (maquette : « Cette recommandation date de trois ans. »). */
export function staleNotice(signals: readonly MemorySignal[], now: Date): string | null {
  const recos = signals.filter((s) => s.level === "recommended");
  if (recos.length === 0 || recos.some((s) => !isStale(s, now))) return null;
  const newest = recos.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
  const years = ageInYears(newest.createdAt, now);
  return `Cette recommandation date de ${numberWord(years)} ans.`;
}

export function rankLabel(index: number, origin: SearchResult["origin"]): string {
  if (origin === "discovery") return "Découverte";
  return index === 0 ? "Meilleur match" : `n°${index + 1}`;
}

const ORDINALS = ["premier", "deuxième", "troisième"];

export const INTRO_TEXT = {
  none: "Personne dans ton cercle ne connaît encore suffisamment ce coin. Retire un critère pour élargir la recherche.",
  insufficient: "Je n’ai pas encore assez de signaux fiables dans ton cercle pour te donner une réponse avec confiance.",
  discoveryOnlyAfter: "Une découverte publique — sans aucun signal de ton cercle, donc à prendre comme une piste.",
} as const;

/** Phrase d'introduction, sur le modèle de la maquette (« J’ai trois idées solides pour toi. »). */
export function introFor(results: readonly SearchResult[]): RichText {
  const personal = results.filter((r) => r.origin === "personal");
  if (results.length === 0) return [{ text: INTRO_TEXT.none }];
  if (personal.length === 0) return [{ text: INTRO_TEXT.insufficient }];

  const [best] = personal;
  // La citation éventuelle reste sur la carte : l'intro garde la phrase seule.
  const reason = best!.lines[0]?.text.split(" : «")[0] ?? null;
  if (results.length === 1) {
    return [
      { text: "Une réponse nette plutôt que trois. " },
      { text: best!.name, strong: true },
      { text: reason ? ` : ${reason}.` : "." },
    ];
  }
  const lead = results.length === 3 ? "J’ai trois idées solides pour toi. " : "J’ai deux idées pour toi. ";
  return [
    { text: lead },
    { text: best!.name, strong: true },
    { text: reason ? ` semble être le meilleur match : ${reason}.` : " semble être le meilleur match." },
  ];
}

/** La recherche a-t-elle une réponse sûre ? Sinon, WHERE propose de demander au réseau. */
export function isConfident(results: readonly SearchResult[]): boolean {
  return results.some((r) => r.origin === "personal" && r.confidence.level === "forte");
}

/**
 * Appel au réseau quand la confiance est insuffisante (maquette, scénario « zikhron ») :
 * « Je n’ai pas encore assez de signaux fiables dans ton cercle pour te donner une réponse avec
 * confiance. Mais trois personnes pourraient probablement t’aider. »
 */
export function askIntroFor(results: readonly SearchResult[], people: readonly { name: string; relevant: boolean }[]): RichText | null {
  const helpers = people.filter((p) => p.relevant);
  if (isConfident(results) || helpers.length === 0) return null;
  const who: RichText =
    helpers.length === 1
      ? [{ text: helpers[0]!.name, strong: true }, { text: " pourrait probablement t’aider." }]
      : [{ text: `${numberWord(helpers.length)} personnes`, strong: true }, { text: " pourraient probablement t’aider." }];
  const lead = results.some((r) => r.origin === "personal")
    ? "Aucune de ces pistes n’est encore confirmée par une recommandation récente. Mais "
    : `${INTRO_TEXT.insufficient} Mais `;
  return [{ text: lead }, ...who];
}

/** Notice après les cartes quand une découverte complète la liste. */
export function afterFor(results: readonly SearchResult[]): string | null {
  const index = results.findIndex((r) => r.origin === "discovery");
  if (index < 0) return null;
  if (index === 0) return INTRO_TEXT.discoveryOnlyAfter;
  return `Le ${ORDINALS[index]} est une découverte : personne de ton cercle ne l’a encore validé, je te le montre pour l’exploration.`;
}
