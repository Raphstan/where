import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { describe, expect, it } from "vitest";
import { MESSAGES, NAMESPACES } from "./messages";
import { routing } from "./routing";

/** Variables ICU d'un message ({name}, {count, plural, …}, balises <b>…</b>), branches comprises. */
function variables(ast: MessageFormatElement[], out = new Set<string>()): Set<string> {
  for (const el of ast) {
    if (el.type === TYPE.argument || el.type === TYPE.number || el.type === TYPE.date || el.type === TYPE.time) {
      out.add(el.value);
    } else if (el.type === TYPE.plural || el.type === TYPE.select) {
      out.add(el.value);
      for (const opt of Object.values(el.options)) variables(opt.value, out);
    } else if (el.type === TYPE.tag) {
      out.add(`<${el.value}>`);
      variables(el.children, out);
    }
  }
  return out;
}

/** Toutes les clés « a.b.c » d'un objet de messages, avec leurs variables ICU ({name}…). */
function flatten(obj: unknown, prefix = ""): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "string") {
        out.set(key, [...variables(parse(v, { ignoreTag: false }))].sort());
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
