import type { T } from "@/i18n/translator";
import { evidenceLabelLong, type EvidenceLevel } from "@/lib/evidence";
import { fold } from "./match";
import { ageInYears, isStale, type MemorySignal } from "./signal";
import type { EvidenceLine, Person, RichText, SearchResult } from "./types";

/*
 * Textes : messages/{langue}/search.json. En français, mot pour mot depuis docs/prototype.html.
 * Les libellés longs des niveaux de preuve viennent de l'espace `evidence` (jamais dupliqués).
 */

/** Traducteurs de la recherche : `t` pour l'espace `search`, `ev` pour l'espace `evidence`. */
export type SearchT = { t: T; ev: T };

/** Libellé des déductions de WH3RE (maquette EVLABEL.pref). Jamais attribué à un proche. */
export function deductionLabel(t: T): string {
  return t("deductionLabel");
}

/** Niveaux rappelés dans « Pourquoi ce choix ? », dans l'ordre de la maquette (whyBody). */
export const EVIDENCE_REMINDER_LEVELS: readonly EvidenceLevel[] = ["recommended", "visited", "booked", "saved", "public"];

/** Rappel des niveaux de preuve, mot pour mot (maquette whyBody : « Information publique uniquement »). */
export function evidenceReminder({ t, ev }: SearchT): { level: EvidenceLevel; label: string }[] {
  return EVIDENCE_REMINDER_LEVELS.map((level) => ({
    level,
    label: level === "public" ? t("reminderPublic") : evidenceLabelLong(ev, level),
  }));
}

/** Provenances autorisées (CLAUDE.md § 2.3). */
export type Provenance = "circle" | "booking" | "share" | "web" | "mine";

export function provenanceKey(level: EvidenceLevel, fromCircle: boolean): Provenance {
  switch (level) {
    case "recommended":
    case "visited":
      return fromCircle ? "circle" : "mine";
    case "booked_confirmed":
    case "booked":
      return "booking";
    case "saved":
      return "share";
    case "public":
      return "web";
  }
}

export function provenanceFor(t: T, level: EvidenceLevel, fromCircle: boolean): string {
  return t(`provenance.${provenanceKey(level, fromCircle)}`);
}

/** « trois » pour 3, comme la maquette ; au-delà de dix, en chiffres. */
export function numberWord(t: T, n: number): string {
  return Number.isInteger(n) && n >= 0 && n <= 10 ? t(`numbers.n${n}`) : String(n);
}

/** « en juin » la même année, « en 2025 » sinon (maquette : « David y a réservé en juin »). */
export function whenPhrase(t: T, date: Date, now: Date): string {
  return date.getUTCFullYear() === now.getUTCFullYear()
    ? t("whenMonth", { month: t(`months.m${date.getUTCMonth() + 1}`) })
    : t("whenYear", { year: String(date.getUTCFullYear()) });
}

/** Occasions connues (forme repliée → clé de message), en français, anglais et hébreu. */
const OCCASION_KEYS: Record<string, string> = {
  date: "date",
  amis: "amis",
  groupe: "groupe",
  famille: "famille",
  business: "business",
  calme: "calme",
  fete: "fete",
  "occasion speciale": "occasionSpeciale",
  dejeuner: "dejeuner",
  touristes: "touristes",
  travail: "travail",
  "pour travailler": "travail",
  "sejour a deux": "sejourADeux",
  // English
  friends: "amis",
  group: "groupe",
  family: "famille",
  quiet: "calme",
  party: "fete",
  "special occasion": "occasionSpeciale",
  lunch: "dejeuner",
  tourists: "touristes",
  work: "travail",
  "to work": "travail",
  "romantic getaway": "sejourADeux",
  "couple getaway": "sejourADeux",
  // Hebrew
  "דייט": "date",
  "חברים": "amis",
  "קבוצה": "groupe",
  "משפחה": "famille",
  "עסקים": "business",
  "שקט": "calme",
  "מסיבה": "fete",
  "אירוע מיוחד": "occasionSpeciale",
  "ארוחת צהריים": "dejeuner",
  "תיירים": "touristes",
  "עבודה": "travail",
  "חופשה זוגית": "sejourADeux",
};

export function occasionPhrase(t: T, occasion: string): string {
  const key = OCCASION_KEYS[fold(occasion)];
  return key ? t(`occasion.${key}`) : t("occasionOther", { occasion });
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

function quote(t: T, note: string): string {
  const n = note.trim().replace(/\s+/g, " ");
  return t("quote", { note: n.length > NOTE_MAX ? `${n.slice(0, NOTE_MAX - 1).trimEnd()}…` : n });
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
export function signalSentence(t: T, signal: MemorySignal, now: Date, wantedOccasion: string | null): string | null {
  const name = signal.author.kind === "member" ? signal.author.name.trim() : null;
  const occ = pickOccasion(signal, wantedOccasion);
  const note = signal.note?.trim() ? quote(t, signal.note) : null;
  const who = name ? "member" : "self";

  switch (signal.level) {
    case "recommended": {
      const year = String(signal.createdAt.getUTCFullYear());
      const base = isStale(signal, now)
        ? t(`sentence.recommendedStale.${who}`, { name: name ?? "", year })
        : occ
          ? t(`sentence.recommendedFor.${who}`, { name: name ?? "", occasion: occasionPhrase(t, occ) })
          : t(`sentence.recommended.${who}`, { name: name ?? "" });
      return note ? t("sentence.withNote", { base, note }) : base;
    }
    case "visited":
      if (name) return note ? t("sentence.visitedNote.member", { name, note }) : t("sentence.visited.member", { name });
      return note ? t("sentence.visitedNote.self", { note }) : t("sentence.visited.self");
    case "booked_confirmed":
    case "booked":
      return t(`sentence.booked.${who}`, { name: name ?? "", when: whenPhrase(t, signal.createdAt, now) });
    case "saved":
      return t(`sentence.saved.${who}`, { name: name ?? "" });
    case "public":
      return note;
  }
}

export function evidenceLine(tr: SearchT, signal: MemorySignal, now: Date, wantedOccasion: string | null): EvidenceLine | null {
  const text = signalSentence(tr.t, signal, now, wantedOccasion);
  if (!text) return null;
  const person = signal.level === "public" ? null : personOf(signal);
  return {
    kind: "evidence",
    level: signal.level,
    text,
    label: evidenceLabelLong(tr.ev, signal.level),
    provenance: provenanceFor(tr.t, signal.level, person !== null),
    person,
  };
}

/** Déduction de WH3RE : ce qui, dans la fiche du lieu, correspond à la demande. */
export function deductionLine(t: T, matches: readonly string[]): EvidenceLine | null {
  if (matches.length === 0) return null;
  return {
    kind: "deduction",
    text: t("deduction", { matches: matches.join(", ") }),
    label: deductionLabel(t),
    provenance: t("provenance.mine"),
    person: null,
  };
}

/** Phrases de la maquette pour la découverte publique (clés de `discovery.*`). */
export type DiscoveryText = "headline" | "noCircle" | "unknownPersonal" | "unknownVibe";

export function discoveryText(t: T, key: DiscoveryText): string {
  return t(`discovery.${key}`);
}

export function bestMatchHeadline(t: T): string {
  return t("bestMatch");
}

export function ratingLine(tr: SearchT, rating: number, count: number | null): EvidenceLine {
  return {
    kind: "evidence",
    level: "public",
    text: count ? tr.t("ratingWithCount", { rating, count }) : tr.t("rating", { rating }),
    label: evidenceLabelLong(tr.ev, "public"),
    provenance: tr.t("provenance.web"),
    person: null,
  };
}

export function noCircleLine(tr: SearchT): EvidenceLine {
  return {
    kind: "evidence",
    level: "public",
    text: discoveryText(tr.t, "noCircle"),
    label: evidenceLabelLong(tr.ev, "public"),
    provenance: tr.t("provenance.web"),
    person: null,
  };
}

export const MAX_UNKNOWNS = 4;

/** « Ce que nous ne savons pas encore » pour un lieu de la mémoire : les trous réels des preuves. */
export function personalUnknowns(
  t: T,
  signals: readonly MemorySignal[],
  unmatchedVibes: readonly string[],
  when: string | null,
  now: Date,
): string[] {
  const personal = signals.filter((s) => s.level !== "public");
  const out: string[] = [];
  if (!personal.some((s) => s.level === "visited")) out.push(t("unknown.noVisit"));
  const authors = new Set(personal.map((s) => (s.author.kind === "self" ? "self" : s.author.id)));
  if (authors.size === 1 && personal[0]?.author.kind === "member") out.push(t("unknown.noSecondOpinion"));
  if (personal.length > 0 && personal.every((s) => isStale(s, now))) out.push(t("unknown.noRecentSignal"));
  for (const v of unmatchedVibes) out.push(t("unknown.vibe", { vibe: v }));
  if (when) out.push(t("unknown.availability", { when }));
  return out.slice(0, MAX_UNKNOWNS);
}

export function discoveryUnknowns(t: T, when: string | null): string[] {
  const out: string[] = [discoveryText(t, "unknownPersonal"), discoveryText(t, "unknownVibe")];
  if (when) out.push(t("unknown.availability", { when }));
  return out;
}

/** Notice d'ancienneté (maquette : « Cette recommandation date de trois ans. »). */
export function staleNotice(t: T, signals: readonly MemorySignal[], now: Date): string | null {
  const recos = signals.filter((s) => s.level === "recommended");
  if (recos.length === 0 || recos.some((s) => !isStale(s, now))) return null;
  const newest = recos.reduce((a, b) => (a.createdAt > b.createdAt ? a : b));
  const years = ageInYears(newest.createdAt, now);
  return t("stale", { years: numberWord(t, years) });
}

export function rankLabel(t: T, index: number, origin: SearchResult["origin"]): string {
  if (origin === "discovery") return t("rank.discovery");
  return index === 0 ? t("rank.best") : t("rank.nth", { n: String(index + 1) });
}

/** Phrase d'introduction, sur le modèle de la maquette (« J’ai trois idées solides pour toi. »). */
export function introFor(t: T, results: readonly SearchResult[]): RichText {
  const personal = results.filter((r) => r.origin === "personal");
  if (results.length === 0) return [{ text: t("intro.none") }];
  if (personal.length === 0) return [{ text: t("intro.insufficient") }];

  const [best] = personal;
  // La citation éventuelle reste sur la carte : l'intro garde la phrase seule.
  const reason = best!.lines[0]?.text.split(t("noteSplit"))[0] ?? null;
  if (results.length === 1) {
    return [
      { text: t("intro.single") },
      { text: best!.name, strong: true },
      { text: reason ? t("intro.singleReason", { reason }) : t("intro.singleEnd") },
    ];
  }
  return [
    { text: results.length === 3 ? t("intro.three") : t("intro.two") },
    { text: best!.name, strong: true },
    { text: reason ? t("intro.bestReason", { reason }) : t("intro.best") },
  ];
}

/** La recherche a-t-elle une réponse sûre ? Sinon, WH3RE propose de demander au réseau. */
export function isConfident(results: readonly SearchResult[]): boolean {
  return results.some((r) => r.origin === "personal" && r.confidence.level === "forte");
}

/**
 * Appel au réseau quand la confiance est insuffisante (maquette, scénario « zikhron ») :
 * « Je n’ai pas encore assez de signaux fiables dans ton cercle pour te donner une réponse avec
 * confiance. Mais trois personnes pourraient probablement t’aider. »
 */
export function askIntroFor(
  t: T,
  results: readonly SearchResult[],
  people: readonly { name: string; relevant: boolean }[],
): RichText | null {
  const helpers = people.filter((p) => p.relevant);
  if (isConfident(results) || helpers.length === 0) return null;
  const who: RichText =
    helpers.length === 1
      ? [{ text: helpers[0]!.name, strong: true }, { text: t("ask.one") }]
      : [
          { text: t("ask.people", { n: numberWord(t, helpers.length) }), strong: true },
          { text: t("ask.many") },
        ];
  const personal = results.filter((r) => r.origin === "personal");
  const lead =
    personal.length === 0
      ? t("intro.insufficient")
      : personal[0]!.conflictNotice
        ? t("ask.conflict")
        : t("ask.noRecent");
  return [{ text: t("ask.but", { lead }) }, ...who];
}

/** Notice après les cartes quand une découverte complète la liste. */
export function afterFor(t: T, results: readonly SearchResult[]): string | null {
  const index = results.findIndex((r) => r.origin === "discovery");
  if (index < 0) return null;
  if (index === 0) return t("intro.discoveryOnlyAfter");
  return t("after", { ordinal: t(`afterOrdinal.o${index}`) });
}
