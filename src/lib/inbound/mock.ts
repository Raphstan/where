import type { EmailKind } from "./rules";
import { normalizeClassification, type Classification, type ForwardedEmail } from "./schema";

/**
 * Classification factice par mots-clés, pour développer sans clé Anthropic (WHERE_ASK_MOCK=1,
 * jamais en production). Même règle que le prompt : une commande (plats, total, livraison,
 * retrait) n'est jamais une table, même envoyée par Tabit.
 */
const RULES: readonly [EmailKind, RegExp][] = [
  // « Cancellation is free up to… » n'est pas une annulation : seul un verbe au passé compte.
  ["cancellation", /\bcancell?ed\b|\bannulé|בוטלה|ביטול הזמנה/i],
  ["delivery", /\b(livraison|delivery|takeaway|take-away|pickup|your order|tabit order|total paid)\b|à emporter|משלוח|איסוף עצמי|סה״כ ששולם/i],
  ["hotel", /\b(h[ôo]tel|booking\.com|check-in|airbnb)\b|מלון|צ'ק-אין/i],
  ["activity", /\b(billets?|tickets?|concert|dégustation|tour)\b|visite guidée|כרטיס/i],
  ["table", /\b(r[ée]servation|reservation|table|party of|convives|guests)\b|הזמנת מקום|סועדים|ההזמנה שלך/i],
];

const PLATFORMS = ["Tabit", "Ontopo", "Resy", "OpenTable", "Restu", "Booking", "Airbnb", "Wolt"] as const;

/** « … at Fantastic », « … chez MILA », « …ב-Pizza Lola », « … à Barby » : le nom après la préposition. */
const PLACE = /(?:(?:^|\s)(?:at|chez|à|from)\s+|ב-|מ-)([A-Z0-9][\w'’&.-]*(?: [A-Z0-9][\w'’&.-]*)*)/;

const DATE = /\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/;

export function mockClassify(email: ForwardedEmail): Classification {
  const text = `${email.subject ?? ""}\n${email.text}`;
  const kind = RULES.find(([, re]) => re.test(text))?.[0] ?? "other";
  const platform = PLATFORMS.find((p) => new RegExp(`\\b${p}\\b`, "i").test(text)) ?? null;
  const place = PLACE.exec(text)?.[1] ?? null;
  const d = DATE.exec(text);
  const reservedFor = d
    ? d[1]
      ? `${d[1]}-${d[2]}-${d[3]}`
      : `${d[6]}-${d[5]!.padStart(2, "0")}-${d[4]!.padStart(2, "0")}`
    : null;
  return normalizeClassification({
    kind,
    place_name: place && !PLATFORMS.some((p) => p.toLowerCase() === place.toLowerCase()) ? place : null,
    city: null,
    platform,
    reserved_for: reservedFor,
  });
}
