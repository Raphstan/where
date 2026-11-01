import { LEGAL_CONTACT, type LegalTexts } from "./types";

const PUBLISHER = "[ÉDITEUR]";

export const fr: LegalTexts = {
  updated: "Dernière mise à jour : 1er novembre 2026",
  terms: {
    title: "Conditions d’utilisation",
    metaTitle: "Conditions d’utilisation",
    intro:
      "Ces conditions encadrent ton utilisation de WH3RE. Elles sont courtes et écrites pour être lues. En créant un compte, tu les acceptes.",
    sections: [
      {
        heading: "1. Le service",
        body: [
          "WH3RE est un chat qui t’aide à trouver un lieu (restaurant, bar, hôtel, activité) à partir de ta propre mémoire et des recommandations de tes proches.",
          `WH3RE est édité par ${PUBLISHER}. Contact : ${LEGAL_CONTACT}.`,
        ],
      },
      {
        heading: "2. Une bêta privée et gratuite",
        body: [
          "WH3RE est en bêta. L’accès se fait sur invitation, ou par le lien privé qu’un membre t’a envoyé. Le service est gratuit pendant la bêta.",
          "Une bêta, ça bouge : des fonctions peuvent changer, être retirées, ou mal marcher. Le service peut aussi s’arrêter. Dans ce cas, tu seras prévenu·e par email au moins 30 jours avant, avec un moyen de récupérer tes données.",
        ],
      },
      {
        heading: "3. Ton compte",
        body: [
          "Tu te connectes par un lien envoyé à ton adresse email, sans mot de passe. La sécurité de ton compte dépend donc de celle de ta boîte mail : protège-la.",
          "Tu dois avoir au moins 16 ans. Un compte est personnel : ne le partage pas.",
        ],
      },
      {
        heading: "4. Ce que tu mets dans WH3RE",
        body: [
          "Tes recommandations, tes retours après visite, tes notes et les emails que tu transfères restent à toi. Tu nous autorises seulement à les stocker et à les traiter pour faire fonctionner le service pour toi, et pour les personnes avec qui tu choisis de partager.",
          "Tu es responsable de ce que tu ajoutes. Pas de contenu illégal, injurieux ou diffamatoire, et rien qui porte atteinte aux droits de quelqu’un.",
        ],
      },
      {
        heading: "5. Tes proches",
        body: [
          "Quand tu demandes une recommandation à ton réseau, c’est toi qui envoies le message (WhatsApp, lien copié…). WH3RE n’envoie rien à tes proches sans ta confirmation.",
          "N’ajoute à ton cercle que des personnes que tu connais, et ne leur écris que pour de vraies demandes. Ton cercle n’est visible que par toi.",
        ],
      },
      {
        heading: "6. Les réponses de WH3RE",
        body: [
          "Les réponses sont produites automatiquement, en partie par une intelligence artificielle. Ce sont des suggestions : elles peuvent être incomplètes ou fausses (horaires, prix, disponibilités, lieu fermé…). Vérifie avant de te déplacer ou de réserver.",
          "WH3RE ne réserve rien à ta place. Si tu réserves sur un site tiers, ses propres conditions s’appliquent.",
        ],
      },
      {
        heading: "7. Usage correct",
        body: [
          "Pour que le service reste utilisable par tous, il est interdit de :",
          "- contourner les limites d’usage quotidiennes, ou automatiser des requêtes ;",
          "- tenter d’accéder aux données d’autres personnes ou au fonctionnement interne du service ;",
          "- utiliser WH3RE pour du démarchage, du spam ou pour harceler quelqu’un ;",
          "- copier le service ou en extraire massivement le contenu.",
          "En cas d’abus, ton accès peut être suspendu. Sauf urgence, tu en es informé·e avant, avec la raison.",
        ],
      },
      {
        heading: "8. Responsabilité",
        body: [
          "Pendant la bêta, WH3RE est fourni « en l’état », sans garantie de disponibilité ni de résultat. Dans les limites permises par la loi, l’éditeur n’est pas responsable des dommages indirects, ni des choix faits sur la base d’une suggestion.",
          "Rien dans ces conditions ne limite les droits que la loi de ton pays de résidence te garantit en tant que consommateur.",
        ],
      },
      {
        heading: "9. Supprimer ton compte",
        body: [
          "Tu peux supprimer ton compte à tout moment, depuis Profil › Confidentialité. Tes données sont alors effacées, comme décrit dans la politique de confidentialité.",
        ],
      },
      {
        heading: "10. Données personnelles",
        body: [
          "La manière dont WH3RE traite tes données est décrite dans la politique de confidentialité, qui fait partie de ces conditions.",
        ],
      },
      {
        heading: "11. Changements",
        body: [
          "Ces conditions peuvent évoluer. Pour tout changement important, tu es prévenu·e par email au moins 15 jours avant. Si tu n’es pas d’accord, tu peux supprimer ton compte.",
        ],
      },
      {
        heading: "12. Droit applicable",
        body: [
          "Ces conditions sont soumises au droit israélien. En cas de litige, on cherche d’abord une solution à l’amiable : écris-nous. À défaut, les tribunaux compétents d’Israël sont saisis, sans préjudice des règles protectrices de ton pays de résidence si tu es consommateur·rice dans l’Union européenne.",
        ],
      },
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    metaTitle: "Politique de confidentialité",
    intro:
      "WH3RE est privé par défaut. Cette page dit, simplement, quelles données sont traitées, pourquoi, chez qui, combien de temps, et comment tu gardes la main. Elle couvre l’appli WH3RE et la liste d’attente de wh3re.com.",
    sections: [
      {
        heading: "1. Qui est responsable",
        body: [
          `Le responsable du traitement est ${PUBLISHER}. Pour toute question ou demande sur tes données : ${LEGAL_CONTACT}.`,
          "WH3RE applique le Règlement général sur la protection des données (RGPD) de l’Union européenne et la loi israélienne sur la protection de la vie privée.",
        ],
      },
      {
        heading: "2. Ce qui est collecté",
        body: [
          "- Ton compte : ton adresse email, et si tu les donnes, ton prénom et ta ville.",
          "- Ce que tu ajoutes : lieux, recommandations, retours après visite, notes.",
          "- Ton cercle : les noms des proches que tu ajoutes, leurs coordonnées si tu les donnes (téléphone, email), et les domaines où tu leur fais confiance.",
          "- Tes conversations : les questions que tu poses à WH3RE et les réponses.",
          "- Les emails que tu transfères : uniquement ceux que tu envoies toi-même à ton adresse WH3RE (expéditeur, objet, texte). WH3RE n’a jamais accès à ta boîte mail.",
          "- Les demandes à ton réseau, et les réponses de tes proches.",
          "- Des données techniques : cookies de session et de langue, compteurs d’usage quotidiens, journaux techniques de l’hébergeur (adresse IP, date).",
          "- Sur wh3re.com (liste d’attente) : ton email, ta langue, ta question si tu en écris une, et qui t’a invité·e. Des statistiques de visite anonymes, sans cookie, mesurent l’audience de la page.",
        ],
      },
      {
        heading: "3. Pourquoi, et sur quelle base",
        body: [
          "- Te fournir le service (te connecter, retrouver ta mémoire, répondre à tes questions) : exécution du contrat, c’est-à-dire des conditions d’utilisation.",
          "- Lire les emails de réservation que tu transfères : ta demande explicite. Tu peux supprimer cette source à tout moment.",
          "- Sécurité, prévention des abus, limites d’usage : intérêt légitime à garder le service sûr et disponible.",
          "- Emails de service (lien de connexion, place dans la bêta) : exécution du contrat. La liste d’attente : ton consentement, retirable par le lien de désinscription.",
        ],
      },
      {
        heading: "4. Ce que WH3RE ne fait pas",
        body: [
          "- Pas de vente ni de location de tes données.",
          "- Pas de publicité, pas de profilage publicitaire, pas de traceurs tiers.",
          "- Pas de publication publique : rien de ce que tu ajoutes n’est visible hors de ton compte sans ton action.",
          "- Pas d’entraînement de modèles d’IA sur tes données.",
        ],
      },
      {
        heading: "5. L’intelligence artificielle",
        body: [
          "Pour comprendre tes questions et classer les emails que tu transfères, leur contenu est envoyé à l’API d’Anthropic (modèle Claude). Anthropic agit comme sous-traitant : par défaut, il n’utilise pas ces données pour entraîner ses modèles et ne les conserve que pour une durée limitée, selon ses conditions commerciales.",
        ],
      },
      {
        heading: "6. Tes proches",
        body: [
          "Quand un proche répond via ton lien privé, sans compte, WH3RE enregistre sa réponse et le prénom qu’il indique. Il voit avant d’envoyer à qui sa réponse est destinée, et choisit si elle peut être réutilisée pour toi plus tard. S’il refuse, sa réponse ne sert qu’à cette question.",
          "Tes proches ne voient jamais qu’ils font partie de ton cercle. Ils ne voient que les questions que tu leur envoies. Un proche peut demander l’effacement de ses réponses en écrivant à l’adresse ci-dessus.",
        ],
      },
      {
        heading: "7. Chez qui sont tes données",
        body: [
          "WH3RE s’appuie sur quelques prestataires, liés par des contrats de traitement des données :",
          "- Supabase : base de données et connexion ;",
          "- Vercel : hébergement du site et de l’appli ;",
          "- Anthropic : compréhension des questions et classement des emails ;",
          "- Resend : envoi des emails et réception des emails transférés ;",
          "- Google (Places) : informations publiques sur les lieux. Seuls les critères de recherche (type de lieu, ville) sont envoyés, jamais ton identité.",
          "Certains sont situés aux États-Unis. Ces transferts sont encadrés par les clauses contractuelles types de la Commission européenne ou par le Data Privacy Framework. Israël bénéficie d’une décision d’adéquation de l’Union européenne.",
        ],
      },
      {
        heading: "8. Combien de temps",
        body: [
          "- Tes données de compte et ta mémoire : tant que ton compte existe.",
          "- Une source ou un élément que tu supprimes : effacé tout de suite.",
          "- Ton compte supprimé : toutes tes données sont effacées immédiatement de la base. Les sauvegardes techniques disparaissent au fil de leur rotation, en 30 jours au plus.",
          "- Liste d’attente : jusqu’à ton entrée dans la bêta ou ta désinscription.",
          "- Journaux techniques : quelques semaines au plus, selon l’hébergeur.",
        ],
      },
      {
        heading: "9. Tes droits",
        body: [
          "Tu peux à tout moment accéder à tes données, les corriger, les effacer, en recevoir une copie dans un format lisible, t’opposer à un traitement ou en demander la limitation, et retirer ton consentement.",
          `L’essentiel se fait directement dans Profil › Confidentialité. Pour le reste, écris à ${LEGAL_CONTACT} : la réponse arrive sous un mois.`,
          "Tu peux aussi saisir une autorité de protection des données : la CNIL en France, l’autorité de ton pays dans l’Union européenne, ou l’Autorité israélienne de protection de la vie privée.",
        ],
      },
      {
        heading: "10. Sécurité",
        body: [
          "Les échanges sont chiffrés (HTTPS). Chaque donnée est rattachée à son propriétaire, et la base refuse tout accès à celles des autres. Connexion sans mot de passe, par lien à usage unique. En cas de fuite de données qui te concerne, tu es prévenu·e, ainsi que l’autorité compétente, dans les délais légaux.",
        ],
      },
      {
        heading: "11. Cookies",
        body: [
          "WH3RE n’utilise que des cookies strictement nécessaires : ta session, ta langue, la page où revenir après la connexion, et le fait que tu as déjà accepté ces conditions sur cet appareil. Aucun cookie publicitaire ni de mesure d’audience, donc pas de bandeau.",
        ],
      },
      {
        heading: "12. Changements",
        body: [
          "Si cette politique change de manière importante, tu es prévenu·e par email avant l’entrée en vigueur. La date en haut de page indique la dernière version.",
        ],
      },
    ],
  },
};
