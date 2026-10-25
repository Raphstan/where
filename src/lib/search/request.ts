import { z } from "zod";

const text = z.string().trim().min(1).max(120);

/** Corps accepté par POST /api/search : les critères normalisés renvoyés par /api/ask. */
export const SearchRequestSchema = z.object({
  criteria: z.object({
    city: text.nullable(),
    area: text.nullable(),
    when: text.nullable(),
    partySize: z.number().int().min(1).max(100).nullable(),
    occasion: text.nullable(),
    placeKind: text.nullable(),
    vibe: z.array(text).max(12),
    constraints: z.array(text).max(12),
  }),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;
