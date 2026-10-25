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
  CRON_SECRET: z.string().min(16).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_WEBHOOK_SECRET: z.string().startsWith("whsec_").optional(),
  WHERE_INBOUND_DOMAIN: z
    .string()
    .regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i)
    .transform((v) => v.toLowerCase())
    .optional(),
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
    CRON_SECRET: process.env.CRON_SECRET || undefined,
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET || undefined,
    WHERE_INBOUND_DOMAIN: process.env.WHERE_INBOUND_DOMAIN || undefined,
    WHERE_ASK_MOCK: process.env.WHERE_ASK_MOCK,
  });
}
