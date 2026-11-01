import { z } from "zod";
import { TRUST_DOMAIN_VALUES } from "./domains";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .default(null);

/**
 * Erreurs de validation d'une personne : des clés, traduites par la route (`circle`, `api.{clé}`).
 */
export const MEMBER_ERRORS = ["invalidPhone", "invalidEmail", "contactRequired"] as const;
export type MemberError = (typeof MEMBER_ERRORS)[number];

export function isMemberError(value: unknown): value is MemberError {
  return typeof value === "string" && (MEMBER_ERRORS as readonly string[]).includes(value);
}

/**
 * « Ajouter une personne » : un prénom et un moyen de la joindre plus tard (WhatsApp ou email).
 * Rien ne lui est envoyé : « La personne ne saura pas qu'elle fait partie de ton cercle, sauf si tu
 * lui demandes quelque chose. »
 */
export const NewMemberSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    relation: optionalText(60),
    description: optionalText(200),
    phone: optionalText(20).refine((v) => v === null || /^\+?[0-9 ().-]{6,20}$/.test(v), "invalidPhone" satisfies MemberError),
    email: optionalText(254).refine((v) => v === null || z.email().safeParse(v).success, "invalidEmail" satisfies MemberError),
  })
  .refine((m) => m.phone !== null || m.email !== null, { message: "contactRequired" satisfies MemberError, path: ["phone"] });

export type NewMember = z.infer<typeof NewMemberSchema>;

export const DomainsSchema = z.object({
  trustDomains: z.array(z.enum(TRUST_DOMAIN_VALUES)).max(TRUST_DOMAIN_VALUES.length),
});

/** Domaines enregistrés : sans doublon, et « Tout » seul s'il est coché. */
export function normalizeDomains<T extends string>(domains: readonly T[]): T[] {
  const unique = [...new Set(domains)];
  return unique.includes("all" as T) ? (["all"] as T[]) : unique;
}
