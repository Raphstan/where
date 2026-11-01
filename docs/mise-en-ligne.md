# Mise en ligne de l'appli (app.wh3re.com)

Une étape à la fois, dans l'ordre. Chaque étape note les valeurs à garder pour la suite : elles
finissent toutes dans les variables Vercel (étape 6).

Décisions (2026-11-01) : appli sur **app.wh3re.com**, projet Supabase **dédié, en Europe (Francfort)**,
emails transférés reçus sur **in.wh3re.com**, envois depuis **wh3re.com** (domaine déjà vérifié chez
Resend pour la landing).

---

## 1. Supabase : le projet

1. supabase.com → New project. Nom : `wh3re-app`. Région : **Central EU (Frankfurt)**.
   Mot de passe de la base : en générer un fort et le garder dans un gestionnaire de mots de passe.
2. Dans le terminal, depuis `Where/where` :
   ```sh
   npx supabase login
   npx supabase link --project-ref <ref du projet>   # le ref est dans l'URL du tableau de bord
   npx supabase db push                              # applique toutes les migrations
   ```
3. Project Settings → API Keys, garder :
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Publishable key (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Secret key (`sb_secret_…`) → `SUPABASE_SERVICE_ROLE_KEY` (ne jamais la mettre côté navigateur)

## 2. Supabase : la connexion

1. Authentication → Sign In / Providers :
   - Email : activé, « Confirm email » activé.
   - **« Allow new users to sign up » : désactivé** (bêta privée : c'est le serveur qui crée les comptes).
2. Authentication → URL Configuration :
   - Site URL : `https://app.wh3re.com`
   - Redirect URLs : `https://app.wh3re.com/auth/confirm`
3. Authentication → Email Templates → Magic Link :
   - Sujet : `Ton lien WH3RE · Your WH3RE sign-in link`
   - Corps : coller tout `supabase/templates/magic_link.html`.

## 3. Resend : envoi des emails de connexion (SMTP)

Sans SMTP à soi, Supabase n'envoie que quelques emails par heure, depuis une adresse générique.

1. Resend → API Keys → Create : nom `wh3re-app-smtp`, permission **Sending access**, domaine `wh3re.com`.
2. Supabase → Authentication → Emails → SMTP Settings → Enable custom SMTP :
   - Sender email : `hello@wh3re.com` · Sender name : `WH3RE`
   - Host : `smtp.resend.com` · Port : `465`
   - Username : `resend` · Password : la clé de l'étape 3.1
3. Supabase → Authentication → Rate Limits : « emails sent per hour » à 30 (largement assez pour la bêta).

## 4. Resend : réception des emails transférés (in.wh3re.com)

1. Resend → Domains → Add domain : `in.wh3re.com`, région **EU (Ireland)**, avec la **réception** activée.
   Resend affiche un enregistrement **MX** pour `in.wh3re.com` : l'ajouter dans le DNS de wh3re.com.
   Ce MX ne concerne que le sous-domaine : il ne touche ni à la landing ni à une boîte sur wh3re.com.
2. Une fois le domaine vérifié : Resend → Webhooks → Add endpoint :
   - URL : `https://app.wh3re.com/api/inbound/resend`
   - Événement : `email.received`
   - Garder le **signing secret** (`whsec_…`) → `RESEND_WEBHOOK_SECRET`
3. Resend → API Keys → Create : nom `wh3re-app-inbound`, permission **Full access** (il faut lire le
   contenu des emails reçus) → `RESEND_API_KEY`.
4. `WHERE_INBOUND_DOMAIN` = `in.wh3re.com`

## 5. Claude (et Google Places, facultatif)

1. console.anthropic.com → API Keys → Create : nom `wh3re-app-prod` → `ANTHROPIC_API_KEY`.
   Settings → Limits : fixer une **limite de dépense mensuelle** (ex. 20 $) pour la bêta.
2. Facultatif, pour la « Découverte » hors du cercle : console.cloud.google.com → activer
   **Places API (New)** → créer une clé, la restreindre à cette API, fixer un quota quotidien
   → `GOOGLE_PLACES_API_KEY`. Sans clé, les réponses viennent seulement de la mémoire et du cercle.

## 6. Vercel : l'appli

1. vercel.com → Add New → Project → importer le dépôt GitHub `Raphstan/where` (compte perso).
   Framework : Next.js, rien d'autre à changer.
2. Variables d'environnement (Production) :

   | Variable | Valeur |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | étape 1.3 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | étape 1.3 |
   | `NEXT_PUBLIC_SITE_URL` | `https://app.wh3re.com` |
   | `SUPABASE_SERVICE_ROLE_KEY` | étape 1.3 |
   | `ANTHROPIC_API_KEY` | étape 5.1 |
   | `GOOGLE_PLACES_API_KEY` | étape 5.2 (ou vide) |
   | `CRON_SECRET` | `openssl rand -hex 32` |
   | `WHERE_INBOUND_DOMAIN` | `in.wh3re.com` |
   | `RESEND_API_KEY` | étape 4.3 |
   | `RESEND_WEBHOOK_SECRET` | étape 4.2 |

   Ne pas mettre `WHERE_ASK_MOCK` (il est de toute façon ignoré en production).
3. Deploy. Puis Settings → Domains → ajouter `app.wh3re.com` et créer dans le DNS le **CNAME** indiqué
   par Vercel.
4. La tâche planifiée (`vercel.json`, retours après visite, tous les jours à 8 h UTC) est créée toute seule.

## 7. privacy@wh3re.com

L'adresse citée dans les CGU, la politique de confidentialité et les emails. Le plus simple : une
redirection vers ta boîte perso, chez le gestionnaire DNS de wh3re.com (ex. Cloudflare Email Routing,
ou la redirection email du registrar). Elle s'applique à `wh3re.com`, pas à `in.wh3re.com` : les deux
ne se gênent pas.

## 8. Avant d'inviter qui que ce soit

1. Remplacer `[ÉDITEUR]` / `[PUBLISHER]` / `[המפעיל]` dans `src/content/legal/{fr,en,he}.ts`.
2. S'inviter soi-même : Supabase → SQL Editor → `supabase/snippets/invite.sql` avec son email.
3. Recette sur app.wh3re.com (voir la feuille de route, étape 5) : connexion par lien, question au chat
   (vraie réponse de Claude), transfert d'un email de réservation à son adresse `…@in.wh3re.com`,
   demande à un proche par WhatsApp, réponse depuis un autre téléphone, suppression de compte.
