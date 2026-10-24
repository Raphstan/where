import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { getServerEnv } from "@/lib/env.server";
import { UNDERSTAND_SYSTEM_PROMPT } from "./prompt";
import {
  normalizeUnderstanding,
  UnderstandingOutputSchema,
  type AskRequest,
  type Understanding,
} from "./schema";

export const ASK_MODEL = "claude-opus-5";

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

/** Construit les tours de conversation : la question, puis l'éventuelle question/réponse de précision. */
export function buildMessages(input: AskRequest): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: input.question }];
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
    messages: buildMessages(input),
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
