import { z } from "zod";

/**
 * Variables d'environnement publiques (exposées au navigateur).
 * Chaque variable doit figurer dans .env.example avec un commentaire.
 * Les clés NEXT_PUBLIC_* sont référencées littéralement pour que Next les remplace au build.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  /** Facultatif : sans valeur, la page de connexion ne propose que le lien magique. */
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().endsWith(".apps.googleusercontent.com").optional(),
});

export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || undefined,
});
