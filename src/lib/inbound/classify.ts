import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { ASK_MODEL, getAskClient, type AskClient } from "@/lib/ask/understand";
import { CLASSIFY_SYSTEM_PROMPT } from "./prompt";
import { ClassificationOutputSchema, normalizeClassification, type Classification, type ForwardedEmail } from "./schema";

export const CLASSIFY_MODEL = ASK_MODEL;

/** Borne de sûreté : une confirmation tient en quelques milliers de caractères. */
export const MAX_EMAIL_CHARS = 30_000;

export type ClassifyErrorCode = "refusal" | "unparseable";

export class ClassifyError extends Error {
  constructor(
    public readonly code: ClassifyErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ClassifyError";
  }
}

/** L'email, présenté comme une donnée entre balises : ce qu'il contient n'est jamais une instruction. */
export function buildClassifyMessages(email: ForwardedEmail): Anthropic.MessageParam[] {
  const subject = email.subject?.trim() || "(sans objet)";
  const body = email.text.slice(0, MAX_EMAIL_CHARS);
  return [
    {
      role: "user",
      content: `Classe cet email transféré.\n\n<email>\nObjet : ${subject}\n\n${body}\n</email>`,
    },
  ];
}

/**
 * Classe un email transféré (table, hôtel, activité, livraison, annulation, autre) et en extrait
 * le lieu, la ville, la plateforme et la date. Sortie structurée validée par zod, puis normalisée.
 */
export async function classifyEmail(email: ForwardedEmail, client: AskClient = getAskClient()): Promise<Classification> {
  const response = await client.messages.parse({
    model: CLASSIFY_MODEL,
    max_tokens: 1024,
    system: [{ type: "text", text: CLASSIFY_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: buildClassifyMessages(email),
    output_config: {
      effort: "low",
      format: zodOutputFormat(ClassificationOutputSchema),
    },
  });

  if (response.stop_reason === "refusal") {
    throw new ClassifyError("refusal", response.stop_details?.explanation ?? undefined);
  }
  if (!response.parsed_output) throw new ClassifyError("unparseable");
  return normalizeClassification(response.parsed_output);
}
