# WHERE

Cahier des charges : `docs/prototype.html` (maquette interactive, 1292 lignes). La lire **en entier** avant
tout ticket, y compris le JavaScript : `PEOPLE`, `PLACES`, `BOOK`, `EVLABEL`, `MEMORY`, `GMAIL_FOUND`,
l'état `S`, les scénarios `SC`, et les écrans `scrAsk`, `scrSarah`, `whyBody`, `bookBody`, `feedbackMsg`.
Les textes d'interface sont repris de la maquette mot pour mot, jamais reformulés.

## 1. Produit

WHERE est un moteur de recherche conversationnel de lieux (restaurants, bars, cafés, hôtels, activités).
Il répond à partir du **cercle de confiance** de l'utilisateur plutôt qu'à partir d'avis anonymes.

**Promesse :** « Demande à ton réseau, sans avoir à demander à tout le monde. »
(Version anglaise dans la maquette : « Ask your network without asking everyone. »)

Accroche de l'accueil : « Où devrais-tu vraiment aller ? » / « Trouve des lieux recommandés par les
personnes auxquelles tu fais confiance. »

- Web app **mobile-first**, responsive (la maquette montre un cadre mobile et un cadre desktop).
- WHERE **ne réserve pas**. Il redirige vers Ontopo, Tabit, Google, le site du lieu, le téléphone ou WhatsApp.
  Texte de la maquette : « WHERE n'est pas le système de réservation. Voici les moyens réellement
  disponibles pour ce lieu : ».
- La compréhension des questions et la classification des emails passent par l'API Anthropic.

### Stack imposée

| Couche | Choix |
|---|---|
| Framework | Next.js (App Router, TypeScript) |
| Styles | Tailwind CSS |
| Données / Auth | Supabase (Postgres + Auth + Row Level Security) |
| Déploiement | Vercel |
| IA | API Anthropic (compréhension des questions, classification) |
| Email entrant | Resend (webhook inbound, transfert d'email uniquement, pas de Gmail OAuth au MVP) |

Pas d'autre framework. Pas de librairie UI lourde (pas de MUI, Chakra, Mantine, shadcn, etc.).

## 2. Principes non négociables

1. **Privé par défaut.** Toute donnée (lieu, réservation, recommandation, membre du cercle, retour après
   visite) n'est visible que par son propriétaire. Le cercle est invisible pour ses membres : « La personne
   ne saura pas qu'elle fait partie de ton cercle, sauf si tu lui demandes quelque chose. » Rien n'est
   jamais publié publiquement. Le partage d'un retour avec le cercle est désactivé par défaut.
2. **Aucune recommandation attribuée à une personne sans preuve.** On n'affiche « Sarah le recommande »
   que si un signal stocké, attribué à Sarah, le justifie (réponse à une demande, qualification explicite).
   Jamais d'inférence. Les déductions de WHERE sont étiquetées « Tes préférences / déduction WHERE »
   et ne sont jamais attribuées à un proche.
3. **Les niveaux de preuve sont une énumération stricte**, du plus fort au plus faible. L'interface emploie
   **toujours** l'une des deux formulations ci-dessous, reprises mot pour mot de la maquette (`EVLABEL`
   pour le libellé long, `evTxt` de l'écran Mémoire pour le libellé court). Aucune autre formulation.

   | Valeur | Libellé long (« Pourquoi ce choix ? ») | Libellé court (Mémoire) | Pastille |
   |---|---|---|---|
   | `recommended` | Recommandé explicitement | Recommandé | corail |
   | `visited` | Visité et confirmé | Visité | olive |
   | `booked_confirmed` | Réservation confirmée | Réservé | bleu |
   | `booked` | Réservation confirmée / signal post-visite | Réservé | bleu |
   | `saved` | Sauvegardé ou partagé | Sauvegardé | ambre |
   | `public` | Information publique | — (jamais dans la mémoire personnelle) | cercle vide |

   Dans la mémoire, le libellé court est suivi de « par {Prénom} » quand le signal vient d'un proche,
   et de rien quand il vient de l'utilisateur. Dans « Pourquoi ce choix ? », chaque ligne de preuve porte
   une phrase libre (ex. « Sarah le recommande pour un date ») **et** le libellé long, suivi de la
   provenance : « de ton cercle », « d'une réservation », « d'un partage », « du web public », « de tes données ».
   Le type TypeScript et l'enum Postgres reflètent cette liste à l'identique. `public` n'est jamais rattaché
   à une personne.
4. **Une livraison ou une réservation annulée ne compte jamais comme visite.** Textes de la maquette :
   « Une livraison n'est pas une visite au restaurant — elles ne compteront jamais comme telle. » ;
   « Une réservation annulée ne compte jamais comme visite. » ; « Tabit gère aussi des livraisons : seule
   une réservation de table comptera comme visite. » Une réservation détectée reste `booked` tant que
   l'utilisateur n'a pas confirmé la visite : « Je garde X dans ta mémoire comme réservé — pas encore
   comme visité. » Ces règles ont des tests.
5. **Aucun message n'est envoyé à un proche sans confirmation explicite de l'utilisateur.** Le flux est
   toujours : composer (message pré-rédigé modifiable, destinataires suggérés) → écran « Envoyer à X, Y ? »
   → bouton « Confirmer l'envoi ». Pas d'envoi automatique, pas de pré-coché silencieux, pas d'envoi en batch.
   Texte de la maquette : « Rien ne part sans ta confirmation. » Après envoi : « rien d'autre n'a été envoyé. »

## 3. Conventions de code

- **TypeScript strict** (`"strict": true`, pas de `any`, pas de `@ts-ignore` sans justification).
- **Composants serveur par défaut.** `"use client"` uniquement pour l'interactivité réelle.
- **Validation des entrées avec `zod`** : formulaires, route handlers, server actions, webhooks Resend,
  et surtout les réponses de l'API Anthropic (jamais de confiance au JSON du modèle sans parsing).
- **Toutes les requêtes Supabase passent par RLS.** Client « anon » porteur de la session utilisateur,
  côté serveur comme côté client. RLS activée sur chaque table, policies explicites.
- **Jamais de clé `service_role` côté client.** Les deux seules opérations qui l'exigent (webhook Resend
  entrant, page invité sans compte) vivent dans des route handlers serveur documentés. Jamais de
  `NEXT_PUBLIC_` pour cette clé.
- **Variables d'environnement documentées dans `.env.example`**, une ligne de commentaire par variable.
- Tests : Vitest. Un test minimal par logique métier (voir § 5).
- Nommage : fichiers `kebab-case`, composants `PascalCase`, tables et colonnes Postgres `snake_case`.
- Langue de l'interface : français, tutoiement, typographie française (espace avant « ? » et « : »,
  guillemets « »), comme dans la maquette.

## 4. Direction artistique

Ton **éditorial, court et chaleureux** : phrases brèves, tutoiement, voix de WHERE à la première personne
(« J'ai trois idées solides pour toi. »), aveu de ce qu'il ne sait pas (« Ce que nous ne savons pas encore »).

### Couleurs (tokens Tailwind, `theme.extend.colors`)

| Token | Hex | Usage dans la maquette |
|---|---|---|
| `cream` | `#F7F2E9` | Fond principal (`--cream`) ; variante `cream-2` `#FBF8F2` pour les cartes |
| `sand` | `#EADFCC` | Fonds secondaires (`--sand`) ; variante `sand-2` `#F1E9DB` ; trait `line` `#E3D9C7` |
| `ink` | `#16202E` | Texte, boutons primaires, bulles utilisateur ; variante `ink-2` `#2B3443` |
| `blue` | `#2E6E8E` | Liens, critères, pastille `booked` (`--sea`) ; fond `blue-2` `#DCE9EF` |
| `coral` | `#DF6F55` | Bouton d'envoi, CTA « Commencer », pastille `recommended`, point du wordmark |

Couleurs secondaires de la maquette, à déclarer aussi : `olive` `#5E7F5A` (visité, confiance forte),
`amber` `#C7913A` (sauvegardé, avertissements), `muted` `#75705F`, `soft` `#A39E8F`, `night` `#1A2436`
(cartes sombres, écran « Tu quittes WHERE »). Pas de couleur hors palette.

### Typographie

- **Fraunces** (titres, noms de lieux, wordmark en capitales espacées, chiffres des stats) via `next/font/google`.
- **Manrope** (texte, interface, boutons).

### Formes

- Rayons : `18px` cartes, `26px` grandes cartes, `999px` boutons et chips. Coins arrondis partout.
- Ombre unique très douce : `0 1px 2px rgba(22,32,46,.04), 0 10px 30px -12px rgba(22,32,46,.18)`.
- Bulles de chat : utilisateur en `ink` à droite, WHERE en `cream-2` bordé à gauche.
- Niveaux de confiance affichés par une pastille à trois barres : `forte` (olive), `moyenne` (ambre),
  `explo` (bleu, « Exploratoire »), `faible` (sable).

## 5. Règle de travail

- **Un ticket à la fois.** Le suivant ne démarre pas tant que le courant n'est pas validé.
- **Demander avant toute décision d'architecture non couverte ici** (nouvelle table, nouveau service
  externe, changement du modèle de preuve, dépendance significative).
- **Écrire un test minimal pour chaque logique métier** :
  - classification d'un email transféré (réservation, confirmation, annulation, livraison, bruit) ;
  - mapping classification → niveau de preuve, et libellés exacts par niveau ;
  - règle « annulation ou livraison ≠ visite » ;
  - mapping des réponses de qualification et de la page invité vers un niveau de preuve ;
  - filtrage par cercle (un utilisateur ne voit jamais un signal hors de son cercle).
- **Ne jamais inventer d'intégration avec Ontopo ou Tabit.** Pas d'API publique : on construit des liens
  sortants seulement, avec les libellés de la maquette (« Réserver avec Ontopo », « Réserver avec Tabit »,
  « Réserver avec Google », « Réserver avec Booking », « Ouvrir le site du restaurant », « Appeler »,
  « Envoyer un WhatsApp », « Voir dans Google Maps »). On n'affiche que les moyens réellement disponibles
  pour le lieu : « Ce lieu ne propose ni Ontopo ni Tabit — je ne t'affiche que ce qui existe vraiment. »
- **Pas de Gmail OAuth au MVP.** Import uniquement par transfert d'email vers une adresse dédiée
  (la maquette propose « Je préfère transférer seulement certains emails » → « Adresse de transfert :
  inbox@where.app »). Les écrans Gmail de la maquette servent de référence pour l'écran de résultats
  d'import et la qualification, pas pour une connexion OAuth.
- **Envoi WhatsApp au MVP** : lien `wa.me` pré-rempli que l'utilisateur ouvre lui-même après l'écran de
  confirmation. Pas de bot WhatsApp, pas d'API Business.

## 6. Écrans, flux et modèle de données (issus de la maquette)

### 6.1 Navigation

- Mobile : onglets **Chat**, **Mémoire**, **Cercle**, **Profil**. Le profil mène à **Mes sources**,
  **Confidentialité**, **États limites**, **Revoir l'onboarding**.
- Desktop : barre latérale avec « + Nouvelle question », **Historique** des conversations, puis
  **Conversation**, **Ma mémoire**, **Mon cercle**, **Mes sources**, **Confidentialité**, **États limites**.
  Les panneaux (« Pourquoi ce choix ? », carte, réservation) s'ouvrent à droite ; sur mobile ce sont des
  feuilles (bottom sheets).
- « Cette section reste secondaire. Le chat demeure le point d'entrée. »

### 6.2 Écrans (ordre du menu « Parcours » de la maquette)

| Clé | Écran | Contenu clé |
|---|---|---|
| `home` | Accueil | Accroche, boîte de question avec exemples, « Commencer », « Voir comment ça marche → » |
| `how` | Comment ça marche | Trois étapes, animation des signaux, carte « La promesse » |
| `onb` | Comment veux-tu commencer ? | 4 choix : retrouver mes anciennes réservations, ajouter des personnes de confiance, poser ma première question, explorer une démonstration |
| `sources-connect` | Connexion des sources | Gmail, WhatsApp, Instagram, TikTok, Google Maps, SMS. **MVP : seul le transfert d'email est actif.** |
| `gmail` / `gmail-results` | Import | Catégories à analyser (livraisons et transports désactivés par défaut), résultats « Voilà ce que j'ai retrouvé. », stats restaurants / hôtels / activités, livraisons exclues |
| `qualify` | Qualifier mes expériences | Pile de cartes : « Tu y es vraiment allé ? » → « Tu le recommanderais ? » → « Pour quelle occasion ? » → « Une chose à savoir ? » |
| `circle-setup` / `circle` | Mon cercle | Par personne : relation, description, domaines de confiance cochables, « Je lui fais confiance pour tout » ; « Ajouter une personne » (contacts, lien WhatsApp, email, lien privé) |
| `chat` | Conversation | Voir 6.3 |
| `ask` | Demander à mon réseau | Voir 6.4 |
| `sarah` | Page invité | Voir 6.5 |
| `memory` | Ma mémoire | Stats, filtres par catégorie, grille de lieux avec libellé court de preuve, « Recommandations données » |
| `sources` | Mes sources | Ce que WHERE peut lire et ce qu'il ne lira jamais ; plateformes de réservation = destinations, pas sources |
| `privacy` | Confidentialité | Principes, données connectées, mon cercle, interrupteurs d'utilisation, suppression (source, lieux importés, compte) avec confirmation |
| `profile` | Profil | Prénom, ville, préférences apprises (chips) |
| `edge` | États limites | Aucun résultat, contradictions, lieu fermé, ancienne reco, complet, annulation, livraison, refus Gmail |

### 6.3 Flux de conversation

1. L'utilisateur pose une question libre (placeholder « Où devrais-tu aller… ? »).
2. WHERE affiche les **critères compris** en chips retirables (« Ce que j'ai compris — touche un critère
   pour le retirer », « + ajouter »). Retirer ou ajouter un critère relance la recherche.
3. Éventuelle **question de précision** à choix (« Plutôt restaurant, bar ou les deux ? »).
4. **Signaux en cours** (« Sarah recommande 2 lieux pour un date », « Disponibilités vérifiées… »).
5. **Phrase d'intro** puis **jusqu'à trois cartes résultat** : rang (« Meilleur match », « n°2 »,
   « Découverte »), nom, quartier, type, ambiance, niveau sonore, prix, distance, disponibilité, phrase
   principale, trois lignes de preuve, pastille de confiance avec texte (« Forte — basée sur 3 signaux
   personnels »), avatars des proches concernés ou « Hors de ton cercle », actions : « Pourquoi ce
   choix ? », « Demander à {Prénom} » ou « Demander à mon cercle », « Voir sur la carte », « Réserver ».
6. Cas particuliers : **données insuffisantes** → « Je n'ai pas encore assez de signaux fiables dans ton
   cercle… » + personnes suggérées avec raison + « Leur demander » ; **aucun résultat** → actions
   « Élargir les critères », « 3 découvertes publiques », « Demander à … » ; **ancienne reco** → « Cette
   recommandation date de trois ans. Demander une info plus récente » ; **contradiction** → WHERE donne
   les deux avis ; **complet** → alternative proche ; **découverte** = carte en pointillés, hors cercle.
7. **Pourquoi ce choix ?** : confiance, « Cette recommandation repose sur » (lignes de preuve avec
   libellé long et provenance), « Ce que nous ne savons pas encore », rappel des niveaux de preuve.
8. **Réserver** : feuille listant uniquement les moyens disponibles pour ce lieu → écran « Tu quittes
   WHERE pour finaliser ta réservation sur {Plateforme}. » → au retour « De retour. As-tu réservé chez
   {Lieu} ? » (Oui / Pas encore / J'ai choisi un autre endroit). Oui → `booked`, jamais `visited`.
9. **Retour après visite** (le lendemain) : « Alors, {Lieu} ? » (Excellent / Bien / Moyen / Pas pour
   moi / Je n'y suis finalement pas allé) → « Tu le recommanderais à quelqu'un ? » (Absolument / Dans
   certains contextes / Pas vraiment) → « Pour quel contexte ? » → « Partager ce retour avec mon cercle
   privé » (désactivé par défaut, jamais publié). « Je n'y suis finalement pas allé » → aucune visite.

### 6.4 Demander à mon réseau (dans le MVP)

Titre : « J'ai préparé la question. Tu gardes la main. » WHERE pré-rédige le message à la troisième
personne (« Raphaël cherche … Tu as une recommandation ? »). Destinataires suggérés avec raison
(« Connaît bien la région », « A enregistré deux lieux à proximité », « Y est allée récemment »,
« Moins pertinent ici — bars & nightlife »). Trois sorties : « Envoyer individuellement sur WhatsApp (n) »,
« Partager dans un groupe WhatsApp », « Copier un lien privé ». Écran de confirmation « Envoyer à
Sarah, David et Maya ? » avec aperçu et lien `where.app/r/{token}` · « Répondre en 20 secondes ».
Après confirmation, message dans le chat : « Envoyé à … sur WhatsApp. Je te préviens dès qu'ils
répondent — rien d'autre n'a été envoyé. »

### 6.5 Page invité (ce que Sarah voit)

URL privée `/r/{token}`, **sans compte, sans appli**. Contenu : la question, champ « Nom du lieu, ou
lien Google Maps / Instagram / TikTok », suggestions, « Tu y es réellement allée ? » (Oui / Non, mais
on m'en a parlé), « Pourquoi tu le recommandes ? », deux interrupteurs activés par défaut :
« Visible seulement par {Prénom} » et « Autoriser WHERE à réutiliser cette reco pour {Prénom} à
l'avenir », bouton « Envoyer ma recommandation ». Puis « Merci, Sarah. » et aperçu de ses réponses
passées (« Tu as déjà une mémoire WHERE. Elle est à toi. »), invitation à garder sa mémoire (hors MVP).

Côté demandeur : notice « Sarah vient de répondre. J'ai une nouvelle recommandation plus fiable — sa
réponse change le classement. », carte « Nouveau · n°1 » avec jauge de confiance, puis carte
« Ce que WHERE sait maintenant de Sarah ». Si la réutilisation est refusée : « cette réponse ne sert
qu'à cette question et ne sera pas gardée. »

Mapping des réponses invité vers les preuves : « Oui » → `recommended` + `visited` ;
« Non, mais on m'en a parlé » → `saved`. Mapping de la qualification : visité + « Absolument » →
`recommended` ; visité → `visited` ; « Non » → ignoré ; « Je ne sais plus » → reste `booked`.

### 6.6 Modèle de données implicite

- `profiles` : 1:1 avec `auth.users` ; prénom, ville, préférences apprises (`text[]`).
- `circle_members` : appartient à un `profile` ; prénom, relation (« Amie proche », « Frère »…),
  description, canal de contact (téléphone WhatsApp ou email), domaines de confiance (`text[]` parmi
  Tout, Restaurants, Hôtels, Nightlife, Voyages, Activités, Famille, Business). **Unidirectionnel et
  invisible** : le membre n'a pas besoin de compte ; lien optionnel vers un `profile` s'il en crée un.
- `places` : nom, quartier/zone, ville, type, ambiance, niveau sonore, prix, options de réservation
  (`text[]` parmi ontopo, tabit, greserve, booking, site, tel, wa, maps) avec les URL/numéros associés.
- `signals` : `profile_id` (propriétaire), `place_id`, `proof_level` (enum § 2.3), `author` = soi ou
  `circle_member_id`, phrase libre, contextes (`text[]` : date, amis, groupe, famille, business, calme,
  fête, occasion spéciale, déjeuner, touristes), note, date du signal, `source` (`forwarded_email`,
  `qualification`, `guest_answer`, `post_visit_feedback`, `manual`, `public`), `reusable` (bool),
  `shared_with_circle` (bool, défaut false).
- `conversations` et `messages` : question, critères (`text[]`), messages typés (user, where, criteria,
  choice, results, people, notice, asked, live, feedback).
- `asks` : conversation, message envoyé, destinataires (`circle_member_id[]`), token du lien privé,
  statut par destinataire (envoyé, répondu).
- `guest_answers` : `ask_id`, `circle_member_id`, lieu saisi ou lien, `visited` (bool), note,
  `visible_only_to_asker` (bool), `reusable` (bool). Génère un `signal`.
- `forwarded_emails` : destinataire de transfert, expéditeur vérifié, brut, classification
  (`reservation`, `confirmation`, `cancellation`, `delivery`, `noise`), lieu et date extraits, statut.
