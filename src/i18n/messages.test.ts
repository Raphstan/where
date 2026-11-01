import { describe, expect, it } from "vitest";
import { MESSAGES, NAMESPACES } from "./messages";
import { routing } from "./routing";

/** Toutes les clés « a.b.c » d'un objet de messages, avec leurs variables ICU ({name}…). */
function flatten(obj: unknown, prefix = ""): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "string") {
        const vars = [...v.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();
        out.set(key, [...new Set(vars)]);
      } else {
        for (const [kk, vv] of flatten(v, key)) out.set(kk, vv);
      }
    }
  }
  return out;
}

describe("messages", () => {
  for (const ns of NAMESPACES) {
    it(`« ${ns} » a les mêmes clés et les mêmes variables dans les trois langues`, () => {
      const fr = flatten(MESSAGES.fr[ns]);
      for (const locale of routing.locales) {
        const other = flatten(MESSAGES[locale][ns]);
        expect([...other.keys()].sort(), `${locale}/${ns}.json`).toEqual([...fr.keys()].sort());
        for (const [key, vars] of fr) {
          expect(other.get(key), `${locale}/${ns}.json : ${key}`).toEqual(vars);
        }
      }
    });
  }
});
