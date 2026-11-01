import type { Criteria } from "@/lib/ask/schema";
import type { EvidenceLevel } from "@/lib/evidence";
import type { Locale } from "@/i18n/routing";
import type { CircleMember } from "@/lib/network/suggest";
import type { MemoryPlace, MemoryRow } from "@/lib/search/rank";
import type { Memory } from "@/lib/search/search";
import type { SearchResult } from "@/lib/search/types";

/**
 * Démonstration (« Explorer une démonstration ») : le cercle et les lieux de la maquette
 * (docs/prototype.html, PEOPLE / PLACES ; mêmes données que supabase/snippets/demo_memory.sql).
 * Rien n'est lu ni écrit en base : le vrai moteur de classement tourne sur cette mémoire fictive.
 * Les fiches restent en français pour le classement ; seul leur affichage est traduit (DISPLAY).
 */

const MEMBERS: CircleMember[] = [
  { id: "demo-sarah", name: "Sarah", trustDomains: ["restaurants", "hotels"], phone: null },
  { id: "demo-noam", name: "Noam", trustDomains: ["nightlife"], phone: null },
  { id: "demo-maya", name: "Maya", trustDomains: ["restaurants", "activities"], phone: null },
  { id: "demo-david", name: "David", trustDomains: ["travel", "family", "activities"], phone: null },
];

const BASE: Omit<MemoryPlace, "id" | "name" | "city" | "area" | "kind" | "vibe" | "noise" | "price"> = {
  address: null,
  googlePlaceId: null,
  lat: null,
  lng: null,
  websiteUrl: null,
  phone: null,
  whatsapp: null,
  ontopoUrl: null,
  tabitUrl: null,
};

const PLACES: MemoryPlace[] = [
  { ...BASE, id: "demo-kandinof", name: "Beit Kandinof", city: "Tel Aviv", area: "Jaffa · Marché aux puces", kind: "Restaurant & galerie", vibe: ["intime", "artistique", "caché"], noise: "Modéré avant 22 h", price: "₪₪₪", ontopoUrl: "https://ontopo.com", websiteUrl: "https://example.com" },
  { ...BASE, id: "demo-herzl", name: "Herzl 16", city: "Tel Aviv", area: "Centre · Rue Herzl", kind: "Bar-restaurant", vibe: ["chaleureux", "musical"], noise: "Animé", price: "₪₪" },
  { ...BASE, id: "demo-nahat", name: "Café Nahat", city: "Tel Aviv", area: "Neve Tzedek", kind: "Café", vibe: ["calme", "bois clair"], noise: "Calme le matin", price: "₪" },
  { ...BASE, id: "demo-dallal", name: "Dallal Bakery", city: "Tel Aviv", area: "Neve Tzedek", kind: "Boulangerie-café", vibe: ["vivant"], noise: "Animé le week-end", price: "₪₪" },
  { ...BASE, id: "demo-spicehaus", name: "Spicehaus", city: "Tel Aviv", area: "Dizengoff", kind: "Bar à cocktails", vibe: ["feutré", "cuivre"], noise: "Variable", price: "₪₪₪" },
  { ...BASE, id: "demo-ricci", name: "Hotel de’ Ricci", city: "Rome", area: "Campo de’ Fiori", kind: "Hôtel boutique", vibe: ["intime", "romantique"], noise: "Calme", price: "€€€" },
];

const DAY = 24 * 3600 * 1000;
type Seed = [place: string, member: string, level: EvidenceLevel, occasion: string[], note: string | null, daysAgo: number];
const SIGNALS: Seed[] = [
  ["demo-kandinof", "demo-sarah", "recommended", ["date"], null, 21],
  ["demo-kandinof", "demo-noam", "visited", ["date", "calme"], "On peut parler tranquillement avant 22 h", 60],
  ["demo-kandinof", "demo-maya", "visited", ["amis"], null, 150],
  ["demo-herzl", "demo-maya", "saved", [], null, 30],
  ["demo-herzl", "demo-david", "booked", [], null, 120],
  ["demo-nahat", "demo-maya", "recommended", ["travail"], null, 7],
  ["demo-nahat", "demo-maya", "visited", ["travail"], null, 7],
  ["demo-dallal", "demo-sarah", "recommended", ["travail"], null, 1160],
  ["demo-spicehaus", "demo-sarah", "recommended", ["date", "calme"], null, 60],
  ["demo-spicehaus", "demo-noam", "visited", ["amis"], "bruyant après 22 h, DJ le jeudi", 30],
  ["demo-ricci", "demo-sarah", "recommended", ["séjour à deux"], null, 150],
  ["demo-ricci", "demo-david", "booked", [], null, 365],
];

/** Notes libres des proches, dans la langue du visiteur. */
const NOTES: Record<string, Record<Locale, string>> = {
  "On peut parler tranquillement avant 22 h": {
    fr: "On peut parler tranquillement avant 22 h",
    en: "You can talk quietly before 10 pm",
    he: "אפשר לדבר בשקט לפני 22:00",
  },
  "bruyant après 22 h, DJ le jeudi": {
    fr: "bruyant après 22 h, DJ le jeudi",
    en: "loud after 10 pm, DJ on Thursdays",
    he: "רועש אחרי 22:00, די־ג׳יי בימי חמישי",
  },
};

export function demoMemory(now: Date, locale: Locale): Memory {
  const places = new Map(PLACES.map((p) => [p.id, p]));
  const members = new Map(MEMBERS.map((m) => [m.id, m]));
  const rows: MemoryRow[] = SIGNALS.map(([placeId, memberId, level, occasion, note, daysAgo], i) => {
    const m = members.get(memberId)!;
    return {
      place: places.get(placeId)!,
      reusable: true,
      signal: {
        id: `demo-${i}`,
        level,
        author: { kind: "member", id: m.id, name: m.name, trustDomains: m.trustDomains },
        occasion,
        note: note ? (NOTES[note]?.[locale] ?? note) : null,
        createdAt: new Date(now.getTime() - daysAgo * DAY),
      },
    };
  });
  return { rows, circleMemberIds: new Set(MEMBERS.map((m) => m.id)), members: MEMBERS };
}

/** La question d'exemple de la maquette : « Où sortir à Tel Aviv ce soir… pour un date ? ». */
export const DEMO_CRITERIA: Criteria = {
  city: "Tel Aviv",
  area: null,
  when: "ce soir",
  partySize: 2,
  occasion: "date",
  placeKind: null,
  vibe: ["caché", "calme"],
  constraints: [],
};

/** Affichage des fiches dans les autres langues (le français est la donnée elle-même). */
const DISPLAY: Record<Exclude<Locale, "fr">, Record<string, string>> = {
  en: {
    "Jaffa · Marché aux puces": "Jaffa · Flea market", "Centre · Rue Herzl": "Center · Herzl St",
    "Restaurant & galerie": "Restaurant & gallery", "Bar-restaurant": "Bar-restaurant", "Café": "Café",
    "Boulangerie-café": "Bakery-café", "Bar à cocktails": "Cocktail bar", "Hôtel boutique": "Boutique hotel",
    intime: "intimate", artistique: "artsy", "caché": "hidden", chaleureux: "warm", musical: "musical", calme: "calm",
    "bois clair": "light wood", vivant: "lively", "feutré": "hushed", cuivre: "copper", romantique: "romantic",
    "Modéré avant 22 h": "Moderate before 10 pm", "Animé": "Lively", "Calme le matin": "Calm in the morning",
    "Animé le week-end": "Lively on weekends", Variable: "Varies", Calme: "Calm", "ce soir": "tonight",
  },
  he: {
    "Jaffa · Marché aux puces": "יפו · שוק הפשפשים", "Centre · Rue Herzl": "מרכז · רחוב הרצל", "Neve Tzedek": "נווה צדק",
    Dizengoff: "דיזנגוף", "Campo de’ Fiori": "קמפו דה פיורי",
    "Restaurant & galerie": "מסעדה וגלריה", "Bar-restaurant": "בר־מסעדה", "Café": "בית קפה",
    "Boulangerie-café": "מאפייה־קפה", "Bar à cocktails": "בר קוקטיילים", "Hôtel boutique": "מלון בוטיק",
    intime: "אינטימי", artistique: "אמנותי", "caché": "נסתר", chaleureux: "חמים", musical: "מוזיקלי", calme: "שקט",
    "bois clair": "עץ בהיר", vivant: "תוסס", "feutré": "מעומעם", cuivre: "נחושת", romantique: "רומנטי",
    "Modéré avant 22 h": "מתון לפני 22:00", "Animé": "תוסס", "Calme le matin": "שקט בבוקר",
    "Animé le week-end": "תוסס בסופי שבוע", Variable: "משתנה", Calme: "שקט", "ce soir": "הערב",
  },
};

export function localizeDemoResult(result: SearchResult, locale: Locale): SearchResult {
  if (locale === "fr") return result;
  const d = DISPLAY[locale];
  const tr = (s: string | null) => (s === null ? null : (d[s] ?? s));
  // Les critères de la démo (français) réapparaissent dans les phrases : « Correspond à tes critères : caché ».
  const words = Object.keys(d).sort((a, b) => b.length - a.length);
  const inText = (text: string) =>
    words.reduce((acc, w) => acc.replace(new RegExp(`(^|[\\s:«"“(])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[\\s,.»"”)])`, "g"), `$1${d[w]}`), text);
  return {
    ...result,
    area: tr(result.area),
    kind: tr(result.kind),
    noise: tr(result.noise),
    vibe: result.vibe.map((v) => d[v] ?? v),
    lines: result.lines.map((l) => ({ ...l, text: inText(l.text) })),
    unknowns: result.unknowns.map(inText),
    conflictNotice: result.conflictNotice && inText(result.conflictNotice),
  };
}
