import "server-only";
import { z } from "zod";

/**
 * Variables serveur. Lues à la demande, jamais au chargement : ce module n'importe pas les
 * variables publiques, pour rester testable sans Supabase.
 */
const serverSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  GOOGLE_PLACES_API_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  WHERE_ASK_MOCK: z
    .string()
    .optional()
    .transform((v) => v === "1" || v === "true"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export function getServerEnv(): ServerEnv {
  return serverSchema.parse({
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    GOOGLE_PLACES_API_KEY: process.env.GOOGLE_PLACES_API_KEY || undefined,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || undefined,
    WHERE_ASK_MOCK: process.env.WHERE_ASK_MOCK,
  });
}
