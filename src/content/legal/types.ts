/**
 * Textes légaux (CGU, politique de confidentialité), un fichier par langue.
 * Pas dans messages/ : ce sont de longs documents, pas des libellés d'interface.
 * Toute modification de fond doit faire avancer LEGAL_VERSION (date ISO) : les comptes
 * gardent la version acceptée (users.terms_version).
 */
export const LEGAL_VERSION = "2026-11-01";

/** Adresse de contact pour les données et les questions juridiques. */
export const LEGAL_CONTACT = "privacy@wh3re.com";

export type LegalSection = {
  heading: string;
  /** Paragraphes. Une ligne commençant par « - » devient un élément de liste. */
  body: string[];
};

export type LegalDoc = {
  title: string;
  metaTitle: string;
  intro: string;
  sections: LegalSection[];
};

export type LegalTexts = {
  updated: string;
  terms: LegalDoc;
  privacy: LegalDoc;
};
