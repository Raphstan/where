// Les 4 chiffres de la bêta, lus en production avec le jeton Supabase personnel (.env.production.local).
// Rien n'est exposé dans l'appli : la requête passe par l'API de gestion Supabase, en lecture seule.
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.production.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);
const token = env.SUPABASE_ACCESS_TOKEN;
const ref = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
if (!token || !ref) {
  console.error("SUPABASE_ACCESS_TOKEN ou NEXT_PUBLIC_SUPABASE_URL manquant dans .env.production.local.");
  process.exit(1);
}

const query = readFileSync(new URL("../supabase/queries/beta-metrics.sql", import.meta.url), "utf8");
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify({ query, read_only: true }),
});
if (!res.ok) {
  console.error(`Supabase a répondu ${res.status} : ${await res.text()}`);
  process.exit(1);
}
const [m] = await res.json();
const pct = (v) => (v === null ? "pas encore de données" : `${v} %`);

console.log(`
Bêta WH3RE (comptes de test exclus)
  Comptes : ${m.comptes} · questions : ${m.questions} (dont ${m.questions_7j} cette semaine)

  1. Les proches répondent-ils ?       ${pct(m.pct_demandes_repondues)}  (${m.demandes_envoyees} demandes envoyées)   objectif > 50 %
  2. Les gens reviennent-ils ?          ${pct(m.pct_revenus_semaine2)}  (${m.comptes_14j} comptes de plus de 14 jours) objectif > 40 %
  3. Les proches s'inscrivent-ils ?     ${pct(m.pct_proches_inscrits)}  (${m.proches_ayant_repondu} proches ont répondu)  objectif > 15 %
  4. La mémoire se remplit-elle ?       ${m.lieux_par_compte ?? 0} lieux par compte                      objectif > 20
`);
