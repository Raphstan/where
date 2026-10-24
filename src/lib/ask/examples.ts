/** Les six questions d'exemple de la maquette (docs/prototype.html, EXAMPLES), dans l'ordre. */
export const EXAMPLE_QUESTIONS = [
  {
    key: "date",
    text: "Où sortir à Tel Aviv ce soir, dans un endroit caché, pas trop bruyant, pour un date ?",
  },
  { key: "group", text: "Un bon restaurant pour 6 personnes ce soir" },
  { key: "rome", text: "Un hôtel romantique à Rome recommandé par mes proches" },
  { key: "cafe", text: "Un café calme pour travailler à Neve Tzedek" },
  { key: "beach", text: "Une plage pas trop touristique près de Tel Aviv" },
  { key: "bar", text: "Un bar animé mais où l’on peut encore parler" },
] as const;

export type ExampleKey = (typeof EXAMPLE_QUESTIONS)[number]["key"];
