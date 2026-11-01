import { LEGAL_VERSION } from "@/content/legal";

/** Cookie posé après acceptation des conditions : évite de redemander la case sur cet appareil. */
export const TERMS_COOKIE = "WH3RE_TERMS";

export function termsAcceptedOnDevice(cookieValue: string | undefined): boolean {
  return cookieValue === LEGAL_VERSION;
}
