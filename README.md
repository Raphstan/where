# WHERE

Moteur de recherche conversationnel de lieux qui répond à partir de ton cercle de confiance.
« Demande à ton réseau, sans avoir à demander à tout le monde. »

Le cahier des charges est la maquette interactive `docs/prototype.html`. Les règles du projet sont
dans `CLAUDE.md`.

## Stack

Next.js (App Router, TypeScript strict), Tailwind CSS v4, Supabase, Vercel, API Anthropic, Resend,
Google Places API (New) pour la seule carte « Découverte ».

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
src/app/api/search/     POST : critères → au plus trois lieux classés, avec leurs preuves
src/lib/search/         confiance, formulations, classement, filtrage par cercle, découverte Google Places
src/components/results/ cartes résultat et panneau « Pourquoi ce choix ? »
src/app/(app)/chat/[id]/ conversation enregistrée, et ask/ : préparer une demande au réseau
src/app/r/[token]/      page invité sans compte : le proche répond depuis son lien privé
src/app/api/            conversations, requests (liens privés + wa.me), replies (suivi)
src/lib/network/        proches suggérés, message pré-rédigé, wa.me, réponse invité → preuves
src/components/network/ écran « Demander à mon réseau »
src/app/api/bookings/   POST : « As-tu réservé ? » → Oui (signal booked + suivi du lendemain)
src/app/api/followups/  retours après visite dus (GET), réponses (POST), partage avec le cercle (PATCH)
src/app/api/cron/       tâche planifiée Vercel : rend dus les retours du lendemain
src/lib/booking/        moyens de réserver, « Tu quittes WHERE », retour après visite → preuves
src/components/booking/ feuille « Réserver », écran « Tu quittes WHERE », bulle de retour
vercel.json             planification du cron (tous les jours à 8 h UTC)
supabase/migrations/    schéma SQL et politiques RLS
supabase/tests/         tests RLS (pgTAP)
supabase/templates/     template de l'email de lien magique
supabase/snippets/      mémoire de démonstration (local uniquement)
```

## Compréhension des questions (Anthropic)

`/api/ask` appelle le modèle `claude-opus-5` avec une sortie structurée (zod) et renvoie les critères
compris, les chips à afficher et, au plus, une question complémentaire.

- Mettre `ANTHROPIC_API_KEY` dans `.env.local` pour un fonctionnement réel.
- Sans clé, `WHERE_ASK_MOCK=1` renvoie une compréhension simulée (développement uniquement).
- `npm run test:live` vérifie les six questions d'exemple de la maquette contre l'API réelle.

## Recherche et classement

`/api/search` lit la mémoire de l'utilisateur sous RLS : ses propres signaux et ceux attribués à des
membres de son cercle (jamais la mémoire d'un autre compte). Les signaux sont agrégés par lieu, filtrés
par les critères (ville, type), puis classés : confiance d'abord, puis score (niveau de preuve, occasion,
quartier, ambiance), puis fraîcheur. Trois résultats au maximum.

| Confiance | Règle |
|---|---|
| Forte | au moins une recommandation explicite de moins de deux ans |
| Moyenne | des signaux personnels, mais aucune recommandation, ou seulement d'anciennes |
| Exploratoire | aucun signal personnel : information publique uniquement |

Quand le cercle fournit moins de trois lieux, une « Découverte » Google Places complète la liste
(`GOOGLE_PLACES_API_KEY`, facultative). Sans clé, la découverte est simplement omise.

Mémoire de démonstration pour un compte local (après une première connexion) :

```bash
docker exec -i supabase_db_where psql -U postgres -v email="'toi@exemple.com'" < supabase/snippets/demo_memory.sql
```

## Demande au réseau

Quand aucun résultat n'atteint une confiance forte, WHERE propose les proches pertinents (domaines de
confiance, lieux déjà attribués dans la zone) et « Leur demander ». L'écran de préparation laisse
modifier le message et choisir les destinataires, puis demande une confirmation explicite. Le serveur
crée alors un lien privé `/r/{token}` par proche et renvoie des liens `wa.me` pré-remplis :
**rien n'est envoyé par le serveur**, l'utilisateur ouvre WhatsApp et envoie lui-même.

Le proche répond sans compte. La page invité (`src/app/r`) est la seule à utiliser
`SUPABASE_SERVICE_ROLE_KEY`, côté serveur, toujours restreinte au jeton. La réponse crée des signaux
attribués au proche dans la mémoire du demandeur : « Oui » → `recommended` + `visited`, « Non, mais on
m’en a parlé » → `saved`. Si la réutilisation est refusée, le signal ne sert qu'à cette conversation.
La conversation (`/chat/[id]`) vérifie les réponses toutes les 10 secondes et relance le classement.

## Réservation et retour après visite

WHERE ne réserve pas. Le bouton « Réserver » d'une carte ouvre la liste des seuls moyens connus pour
ce lieu (colonnes `places.ontopo_url`, `tabit_url`, `website_url`, `phone`, `whatsapp`, et Google Maps
dès que le lieu est localisable). Aucun lien Ontopo ou Tabit n'est construit sans URL connue.

Choisir un moyen affiche « Tu quittes WHERE » ; le lien s'ouvre dans un nouvel onglet. Au retour
(onglet de nouveau visible, ou « Revenir à WHERE ») : « De retour. As-tu réservé chez X ? ».
« Oui » crée un signal `booked` (jamais `visited`) et un suivi `visit_followups` dont l'échéance est
le lendemain à 8 h, heure d'Israël.

Le cron Vercel (`vercel.json`, `/api/cron/visit-followups`, protégé par `CRON_SECRET`) marque chaque
jour les suivis arrivés à échéance. Le chat les propose alors : « Alors, X ? » → « Tu le
recommanderais à quelqu’un ? » → « Pour quel contexte ? ». Visité + « Absolument » → `recommended`,
autre visite → `visited`, « Je n’y suis finalement pas allé » → aucun signal. Le partage avec le
cercle privé est désactivé par défaut.

Tester le cron en local :

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/visit-followups
```

## Supabase hébergé (Vercel)

1. Créer un projet Supabase, puis appliquer les migrations : `npx supabase link` puis `npx supabase db push`.
2. Dans Authentication → Email Templates → Magic Link, coller le contenu de
   `supabase/templates/magic_link.html` (il envoie vers `/auth/confirm` avec `token_hash`).
   Sans ce template, le flux PKCE par défaut fonctionne aussi : `/auth/confirm` accepte `code`.
3. Dans Authentication → URL Configuration, mettre le Site URL de production et ajouter
   `https://<domaine>/auth/confirm` aux Redirect URLs.
4. Renseigner les variables de `.env.example` dans Vercel, dont `CRON_SECRET` (Vercel l'envoie au cron).

## Mise en page

- Mobile (< 1024 px) : barre du haut avec le wordmark, contenu, quatre onglets en bas
  (Chat, Mémoire, Cercle, Profil).
- Desktop (≥ 1024 px) : barre latérale à gauche (nouvelle question, historique, navigation, profil)
  et contenu. À partir de 1280 px, un panneau contextuel à droite accueille « Pourquoi ce choix ? »,
  la carte et les moyens de réserver.
