# WHERE

Moteur de recherche conversationnel de lieux qui répond à partir de ton cercle de confiance.
« Demande à ton réseau, sans avoir à demander à tout le monde. »

Le cahier des charges est la maquette interactive `docs/prototype.html`. Les règles du projet sont
dans `CLAUDE.md`.

## Stack

Next.js (App Router, TypeScript strict), Tailwind CSS v4, Supabase, Vercel, API Anthropic, Resend.

## Démarrer

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:3000
```

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run start` | Sert le build de production |
| `npm run lint` | ESLint |
| `npm run typecheck` | Génère les types de routes puis `tsc --noEmit` |
| `npm test` | Tests Vitest (une fois) |
| `npm run test:watch` | Tests Vitest en continu |

## Structure

```
docs/prototype.html     maquette interactive (cahier des charges)
src/app/layout.tsx      layout racine : polices Fraunces et Manrope, métadonnées
src/app/globals.css     tokens de couleur, typographie, rayons, ombre (@theme Tailwind v4)
src/app/(app)/          coquille de l'app et les quatre pages : chat, memory, circle, profile
src/components/shell/   barre latérale, onglets mobiles, panneau contextuel, gabarit de page
src/lib/                logique partagée (navigation…) et ses tests
```

## Mise en page

- Mobile (< 1024 px) : barre du haut avec le wordmark, contenu, quatre onglets en bas
  (Chat, Mémoire, Cercle, Profil).
- Desktop (≥ 1024 px) : barre latérale à gauche (nouvelle question, historique, navigation, profil)
  et contenu. À partir de 1280 px, un panneau contextuel à droite accueille « Pourquoi ce choix ? »,
  la carte et les moyens de réserver.
