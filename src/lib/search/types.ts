import type { BookingOption } from "@/lib/booking/options";
import type { EvidenceLevel } from "@/lib/evidence";

/** Niveau de confiance affiché par la pastille à trois barres (CLAUDE.md § 4, maquette `.conf`). */
export type ConfidenceLevel = "forte" | "moyenne" | "explo";

export type Confidence = { level: ConfidenceLevel; text: string };

/** Personne à l'origine d'une preuve : un proche du cercle. L'utilisateur lui-même n'a pas d'avatar. */
export type Person = { id: string; name: string; initial: string };

/**
 * Une ligne de preuve. `kind: "evidence"` porte un niveau de preuve strict ; `kind: "deduction"`
 * est une déduction de WHERE (« Tes préférences / déduction WHERE »), jamais attribuée à un proche.
 */
export type EvidenceLine =
  | {
      kind: "evidence";
      level: EvidenceLevel;
      /** Phrase libre, ex. « Sarah le recommande pour un date ». */
      text: string;
      /** Libellé long, mot pour mot : EVIDENCE_LABEL_LONG. */
      label: string;
      /** Provenance : « de ton cercle », « d’une réservation »… */
      provenance: string;
      person: Person | null;
    }
  | { kind: "deduction"; text: string; label: string; provenance: string; person: null };

/** Moyens de réserver ou de s'y rendre, liens sortants uniquement. */
export type PlaceLinks = { googleMapsUrl: string | null };

export type SearchResult = {
  id: string;
  /** « personal » = issu de la mémoire ; « discovery » = Google Places, hors du cercle. */
  origin: "personal" | "discovery";
  rank: string;
  name: string;
  area: string | null;
  kind: string | null;
  vibe: string[];
  noise: string | null;
  price: string | null;
  /** Phrase principale de la carte. */
  headline: string | null;
  lines: EvidenceLine[];
  unknowns: string[];
  confidence: Confidence;
  people: Person[];
  /** Recommandation la plus récente si elle est ancienne : notice « Cette recommandation date de… ». */
  staleNotice: string | null;
  links: PlaceLinks;
  /** Moyens réellement disponibles pour réserver ou joindre le lieu (feuille « Réserver »). */
  booking: BookingOption[];
};

/** Texte riche minimal : segments, certains en gras (nom du lieu). */
export type RichText = { text: string; strong?: boolean }[];

/** Proche à qui demander (voir src/lib/network/suggest.ts). */
export type SuggestedPerson = { id: string; name: string; initial: string; reason: string; relevant: boolean };

export type SearchResponse = {
  intro: RichText;
  results: SearchResult[];
  /** Notice après les cartes, ex. « Le troisième est une découverte… ». */
  after: string | null;
  /** Confiance insuffisante : phrase d'appel au réseau et proches suggérés (sinon null / vide). */
  askIntro: RichText | null;
  people: SuggestedPerson[];
};
