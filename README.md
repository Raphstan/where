# WHERE

Moteur de recherche conversationnel de lieux qui répond à partir de ton cercle de confiance.
« Demande à ton réseau, sans avoir à demander à tout le monde. »

Le cahier des charges est la maquette interactive `docs/prototype.html`. Les règles du projet sont
dans `CLAUDE.md`.

## Stack

Next.js (App Router, TypeScript strict), Tailwind CSS v4, Supabase, Vercel, API Anthropic, Resend.

## Démarrer

Prérequis : Node 20+, Docker (pour Supabase en local).

```bash
npm install
npm run db:start             # Supabase local (Postgres, Auth, Mailpit)
cp .env.example .env.local   # puis coller l'URL et la publishable key affichées par db:start
npm run dev                  # http://localhost:3000
```

Connexion : entre ton email sur `/login`. En local, le lien arrive dans Mailpit sur
http://127.0.0.1:54324, pas dans ta vraie boîte.

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
| `npm run db:start` / `db:stop` | Démarre / arrête la pile Supabase locale |
| `npm run db:reset` | Recrée la base locale depuis `supabase/migrations` |
| `npm run db:types` | Régénère `src/lib/supabase/database.types.ts` depuis la base locale |
| `npm run db:test` | Tests RLS en pgTAP (`supabase/tests`) |
| `npm run test:live` | Tests en direct contre l'API Anthropic sur les six questions de la maquette (`ANTHROPIC_API_KEY` requis, ignorés sinon) |

## Structure

```
docs/prototype.html     maquette interactive (cahier des charges)
src/app/layout.tsx      layout racine : polices Fraunces et Manrope, métadonnées
src/app/globals.css     tokens de couleur, typographie, rayons, ombre (@theme Tailwind v4)
src/app/(app)/          coquille de l'app et les quatre pages : chat, memory, circle, profile
src/components/shell/   barre latérale, onglets mobiles, panneau contextuel, gabarit de page
src/lib/                logique partagée (navigation, niveaux de preuve, env) et ses tests
src/lib/supabase/       clients Supabase (serveur, navigateur, proxy) et types générés
src/proxy.ts            rafraîchit la session et protège les routes de l'app
src/app/login/          connexion par lien magique
src/app/auth/           arrivée du lien magique (confirm) et déconnexion (signout)
src/app/api/ask/        POST : question → critères compris (+ une question de précision au plus)
src/lib/ask/            schémas zod, prompt système, appel Anthropic (sortie structurée), mode factice
src/components/chat/    écran de conversation : bulles, chips de critères, question à choix, composer
supabase/migrations/    schéma SQL et politiques RLS
supabase/tests/         tests RLS (pgTAP)
supabase/templates/     template de l'email de lien magique
```

## Compréhension des questions (Anthropic)

`/api/ask` appelle le modèle `claude-opus-5` avec une sortie structurée (zod) et renvoie les critères
compris, les chips à afficher et, au plus, une question complémentaire. Il n'y a pas encore de résultats.

- Mettre `ANTHROPIC_API_KEY` dans `.env.local` pour un fonctionnement réel.
- Sans clé, `WHERE_ASK_MOCK=1` renvoie une compréhension simulée (développement uniquement).
- `npm run test:live` vérifie les six questions d'exemple de la maquette contre l'API réelle.

## Supabase hébergé (Vercel)

1. Créer un projet Supabase, puis appliquer les migrations : `npx supabase link` puis `npx supabase db push`.
2. Dans Authentication → Email Templates → Magic Link, coller le contenu de
   `supabase/templates/magic_link.html` (il envoie vers `/auth/confirm` avec `token_hash`).
   Sans ce template, le flux PKCE par défaut fonctionne aussi : `/auth/confirm` accepte `code`.
3. Dans Authentication → URL Configuration, mettre le Site URL de production et ajouter
   `https://<domaine>/auth/confirm` aux Redirect URLs.
4. Renseigner les trois variables de `.env.example` dans Vercel.

## Mise en page

- Mobile (< 1024 px) : barre du haut avec le wordmark, contenu, quatre onglets en bas
  (Chat, Mémoire, Cercle, Profil).
- Desktop (≥ 1024 px) : barre latérale à gauche (nouvelle question, historique, navigation, profil)
  et contenu. À partir de 1280 px, un panneau contextuel à droite accueille « Pourquoi ce choix ? »,
  la carte et les moyens de réserver.
