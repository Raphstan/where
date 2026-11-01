import { notFound } from "next/navigation";

// Cette page ne rend jamais rien : pas de validation de navigation instantanée (elle échouerait toujours).
export const instant = false;

/* Toute adresse inconnue sous la langue : la page « introuvable » de [locale]/not-found.tsx. */
export default function CatchAll() {
  notFound();
}
