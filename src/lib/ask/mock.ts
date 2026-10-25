import type { AskRequest, Understanding, UnderstandingOutput } from "./schema";
import { normalizeUnderstanding } from "./schema";

/**
 * Compréhension factice pour développer l'interface sans clé Anthropic (WHERE_ASK_MOCK=1,
 * jamais en production). Reprend les scénarios de la maquette par mots-clés.
 */
export function mockUnderstanding(input: AskRequest): Understanding {
  const q = input.question.toLocaleLowerCase("fr");
  let out: UnderstandingOutput;

  if (/zikhron|enfant|samedi/.test(q)) {
    out = base({
      city: "Zikhron Ya’akov",
      when: "samedi midi",
      party_size: 3,
      occasion: "famille",
      constraints: ["vraiment bon", "pas touristique"],
      tags: ["Zikhron Ya’akov", "samedi midi", "deux enfants", "vraiment bon", "pas touristique"],
    });
  } else if (/caf|travail/.test(q)) {
    out = base({
      area: "Neve Tzedek",
      place_kind: "café",
      occasion: "travail",
      vibe: ["calme"],
      tags: ["Neve Tzedek", "café", "calme", "pour travailler"],
    });
  } else if (/rome|h[ôo]tel/.test(q)) {
    out = base({
      city: "Rome",
      place_kind: "hôtel",
      party_size: 2,
      occasion: "séjour à deux",
      vibe: ["romantique"],
      constraints: ["recommandé par mon cercle"],
      tags: ["Rome", "hôtel", "romantique", "deux personnes", "recommandé par mon cercle"],
    });
  } else if (/\b6\b|groupe|personnes/.test(q)) {
    out = base({
      when: "ce soir",
      party_size: 6,
      place_kind: "restaurant",
      occasion: "groupe",
      tags: ["ce soir", "6 personnes", "bonne table"],
      clarification: { question: "Dans quelle ville ?", options: ["tel aviv", "jérusalem", "haïfa"] },
    });
  } else if (/plage/.test(q)) {
    out = base({
      city: "Tel Aviv",
      place_kind: "plage",
      constraints: ["pas touristique"],
      tags: ["près de Tel Aviv", "plage", "pas touristique"],
    });
  } else if (/bar/.test(q)) {
    out = base({
      place_kind: "bar",
      vibe: ["animé", "conversation possible"],
      tags: ["bar", "animé", "conversation possible"],
    });
  } else {
    out = base({
      city: "Tel Aviv",
      when: "ce soir",
      party_size: 2,
      occasion: "date",
      vibe: ["caché", "conversation possible", "bonne ambiance"],
      constraints: ["disponibilité souhaitée"],
      tags: [
        "Tel Aviv",
        "ce soir",
        "deux personnes",
        "date",
        "caché",
        "conversation possible",
        "bonne ambiance",
        "disponibilité souhaitée",
      ],
      clarification: {
        question: "Plutôt restaurant, bar ou les deux ?",
        options: ["restaurant", "bar", "les deux", "surprends-moi"],
      },
    });
  }

  if (input.clarification) {
    out = {
      ...out,
      clarification: null,
      tags: [...out.tags, input.clarification.answer],
      // La réponse complète le critère sur lequel portait la question (ville ou type de lieu).
      criteria: /ville/i.test(input.clarification.question)
        ? { ...out.criteria, city: input.clarification.answer }
        : { ...out.criteria, place_kind: input.clarification.answer },
    };
  }

  return normalizeUnderstanding(out);
}

function base(
  partial: Partial<UnderstandingOutput["criteria"]> & {
    tags: string[];
    clarification?: UnderstandingOutput["clarification"];
  },
): UnderstandingOutput {
  const { tags, clarification = null, ...criteria } = partial;
  return {
    criteria: {
      city: null,
      area: null,
      when: null,
      party_size: null,
      occasion: null,
      place_kind: null,
      vibe: [],
      constraints: [],
      ...criteria,
    },
    tags,
    clarification,
  };
}
