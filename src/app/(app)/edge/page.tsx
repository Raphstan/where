import type { Metadata } from "next";
import Link from "next/link";
import { PageFrame } from "@/components/shell/page-frame";
import { EXAMPLE_QUESTIONS, type ExampleKey } from "@/lib/ask/examples";

export const metadata: Metadata = { title: "États limites" };

const ask = (key: ExampleKey) => `/chat?q=${encodeURIComponent(EXAMPLE_QUESTIONS.find((e) => e.key === key)!.text)}`;

/*
 * Cas de la maquette (scrEdge) que WHERE gère réellement. « Pas de disponibilité » n'y figure pas :
 * WHERE ne connaît pas les disponibilités (aucune API Ontopo ou Tabit, liens sortants seulement).
 */
const CASES: readonly { title: string; quote: string; text: string; href: string; action: string }[] = [
  {
    title: "Aucun résultat personnel",
    quote: "« Personne dans ton cercle ne connaît encore suffisamment ce quartier. »",
    text: "Élargir les critères · une découverte publique · demander aux personnes les plus pertinentes",
    href: ask("beach"),
    action: "Voir en situation",
  },
  {
    title: "Informations contradictoires",
    quote: "« Sarah trouve ce lieu calme, mais Noam indique qu’il devient bruyant après 22 h. »",
    text: "WHERE explique la nuance (calme avant 22 h) au lieu de trancher arbitrairement.",
    href: ask("bar"),
    action: "Voir en situation",
  },
  {
    title: "Lieu fermé",
    quote: "« Ce lieu apparaît dans d’anciennes recommandations, mais semble désormais fermé. »",
    text: "Écarté des résultats, gardé dans la mémoire avec une mention.",
    href: ask("cafe"),
    action: "Voir en situation",
  },
  {
    title: "Ancienne recommandation",
    quote: "« Cette recommandation date de trois ans. Veux-tu demander une information plus récente ? »",
    text: "Un bouton prépare la question à la bonne personne.",
    href: ask("cafe"),
    action: "Voir en situation",
  },
  {
    title: "Réservation annulée",
    quote: "Une réservation annulée ne compte jamais comme visite.",
    text: "Email d’annulation détecté → la réservation est écartée, sans signal de visite.",
    href: "/import",
    action: "Voir mes imports",
  },
  {
    title: "Livraison",
    quote: "Une commande Tabit, Wolt ou une livraison n’est pas une visite au restaurant.",
    text: "Les commandes de livraison sont exclues de l’import.",
    href: "/import",
    action: "Voir les exclusions",
  },
  {
    title: "Sans import d’emails",
    quote: "Le produit reste utilisable.",
    text: "Réponses de tes proches, retours après visite, données publiques.",
    href: "/onboarding",
    action: "Reprendre sans import",
  },
];

/* États limites (docs/prototype.html, scrEdge). */
export default function EdgePage() {
  return (
    <PageFrame
      title="États limites"
      lead="Ce que WHERE fait quand il ne sait pas, ou quand les signaux se contredisent."
      back="/profile"
    >
      {CASES.map((c) => (
        <div key={c.title} className="flex flex-col gap-2 rounded-card border border-line bg-cream-2 p-4">
          <h2 className="text-[15px] font-bold">{c.title}</h2>
          <div className="flex items-start gap-2.5 rounded-[14px] bg-sand-2 px-3 py-[9px] text-[13.5px] text-ink-2">
            <span aria-hidden>“</span>
            <span>{c.quote}</span>
          </div>
          <p className="text-[12.5px] text-muted">{c.text}</p>
          <Link
            href={c.href}
            className="inline-flex min-h-[30px] items-center self-start rounded-full border-[1.5px] border-line px-[11px] py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink"
          >
            {c.action}
          </Link>
        </div>
      ))}
    </PageFrame>
  );
}
