import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Locale } from "@/i18n/routing";
import { getServerEnv } from "@/lib/env.server";
import { UNDERSTAND_SYSTEM_PROMPT } from "./prompt";
import {
  normalizeUnderstanding,
  UnderstandingOutputSchema,
  type AskRequest,
  type Understanding,
} from "./schema";

export const ASK_MODEL = "claude-sonnet-5";

/** Le sous-ensemble du client dont dépend la compréhension : remplaçable dans les tests. */
export type AskClient = { messages: Pick<Anthropic["messages"], "parse"> };

export type UnderstandErrorCode = "missing_api_key" | "refusal" | "unparseable";

export class UnderstandError extends Error {
  constructor(
    public readonly code: UnderstandErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "UnderstandError";
  }
}

let cached: Anthropic | null = null;

export function getAskClient(): AskClient {
  if (cached) return cached;
  const { ANTHROPIC_API_KEY } = getServerEnv();
  if (!ANTHROPIC_API_KEY) throw new UnderstandError("missing_api_key");
  cached = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  return cached;
}

/**
 * Ligne de langue placée en tête du premier message (jamais dans le prompt système, qui reste
 * stable et mis en cache) : chips, critères et question de précision sont écrits dans cette langue.
 */
export function languageLine(locale: Locale): string {
  return `Langue de réponse : ${locale}`;
}

/**
 * Construit les tours de conversation : la question (précédée de la langue de réponse quand elle
 * est connue), puis l'éventuelle question/réponse de précision.
 */
export function buildMessages(input: AskRequest, locale?: Locale): Anthropic.MessageParam[] {
  const first = locale ? `${languageLine(locale)}\n\n${input.question}` : input.question;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: first }];
  if (input.clarification) {
    messages.push(
      { role: "assistant", content: input.clarification.question },
      { role: "user", content: input.clarification.answer },
    );
  }
  return messages;
}

/**
 * Transforme une question en critères structurés + chips, et décide d'une éventuelle
 * question complémentaire. Sortie structurée validée par zod, puis normalisée.
 */
export async function understandQuestion(
  input: AskRequest,
  client: AskClient = getAskClient(),
  /** Langue de l'interface : celle des chips, des critères et de la question de précision. */
  locale?: Locale,
): Promise<Understanding> {
  const response = await client.messages.parse({
    model: ASK_MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: UNDERSTAND_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: buildMessages(input, locale),
    output_config: {
      effort: "low",
      format: zodOutputFormat(UnderstandingOutputSchema),
    },
  });

  if (response.stop_reason === "refusal") {
    throw new UnderstandError("refusal", response.stop_details?.explanation ?? undefined);
  }
  if (!response.parsed_output) {
    throw new UnderstandError("unparseable");
  }
  return normalizeUnderstanding(response.parsed_output);
}
