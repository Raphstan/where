import { describe, expect, it, vi } from "vitest";
import type { UnderstandingOutput } from "./schema";
import { ASK_MODEL, buildMessages, UnderstandError, understandQuestion, type AskClient } from "./understand";

const output: UnderstandingOutput = {
  criteria: {
    city: "Tel Aviv",
    area: null,
    when: "ce soir",
    party_size: 2,
    occasion: "date",
    place_kind: null,
    vibe: ["caché"],
    constraints: [],
  },
  tags: ["Tel Aviv", "ce soir", "deux personnes", "date", "caché"],
  clarification: { question: "Plutôt restaurant, bar ou les deux ?", options: ["restaurant", "bar"] },
};

function fakeClient(result: { parsed_output: UnderstandingOutput | null; stop_reason?: string }) {
  const parse = vi.fn<(params: unknown) => Promise<Record<string, unknown>>>(async () => ({
    stop_reason: "end_turn",
    stop_details: null,
    ...result,
  }));
  return { client: { messages: { parse } } as unknown as AskClient, parse };
}

describe("buildMessages", () => {
  it("envoie la question seule", () => {
    expect(buildMessages({ question: "Un bar animé" })).toEqual([
      { role: "user", content: "Un bar animé" },
    ]);
  });

  it("rejoue la question de précision et la réponse de l'utilisateur", () => {
    expect(
      buildMessages({
        question: "Où sortir ce soir ?",
        clarification: { question: "Restaurant ou bar ?", answer: "les deux" },
      }),
    ).toEqual([
      { role: "user", content: "Où sortir ce soir ?" },
      { role: "assistant", content: "Restaurant ou bar ?" },
      { role: "user", content: "les deux" },
    ]);
  });
});

describe("understandQuestion", () => {
  it("demande une sortie structurée au bon modèle et normalise le résultat", async () => {
    const { client, parse } = fakeClient({ parsed_output: output });
    const u = await understandQuestion({ question: "Où sortir à Tel Aviv ce soir ?" }, client);

    expect(parse).toHaveBeenCalledTimes(1);
    const params = parse.mock.calls[0]?.[0] as Record<string, unknown> | undefined;
    expect(params).toBeDefined();
    expect(params?.model).toBe(ASK_MODEL);
    expect(params?.output_config).toMatchObject({
      format: expect.objectContaining({ type: "json_schema" }),
    });
    expect(u.tags).toEqual(["Tel Aviv", "ce soir", "deux personnes", "date", "caché"]);
    expect(u.clarification?.options).toEqual(["restaurant", "bar"]);
  });

  it("échoue proprement si le modèle refuse ou renvoie un JSON invalide", async () => {
    await expect(
      understandQuestion({ question: "x" }, fakeClient({ parsed_output: null }).client),
    ).rejects.toMatchObject({ code: "unparseable" } satisfies Partial<UnderstandError>);

    await expect(
      understandQuestion(
        { question: "x" },
        fakeClient({ parsed_output: output, stop_reason: "refusal" }).client,
      ),
    ).rejects.toMatchObject({ code: "refusal" });
  });
});
