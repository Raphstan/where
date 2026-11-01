import type { Locale } from "@/i18n/routing";
import { en } from "./en";
import { fr } from "./fr";
import { he } from "./he";
import type { LegalTexts } from "./types";

export { LEGAL_CONTACT, LEGAL_VERSION } from "./types";
export type { LegalDoc, LegalSection, LegalTexts } from "./types";

export const LEGAL: Record<Locale, LegalTexts> = { en, fr, he };

/** Routes publiques des deux documents. */
export const TERMS_PATH = "/terms";
export const PRIVACY_POLICY_PATH = "/privacy-policy";
