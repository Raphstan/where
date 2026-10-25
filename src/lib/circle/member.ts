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
 * « Ajouter une personne » : un prénom et un moyen de la joindre plus tard (WhatsApp ou email).
 * Rien ne lui est envoyé : « La personne ne saura pas qu'elle fait partie de ton cercle, sauf si tu
 * lui demandes quelque chose. »
 */
export const NewMemberSchema = z
  .object({
    name: z.string().trim().min(1).max(60),
    relation: optionalText(60),
    description: optionalText(200),
    phone: optionalText(20).refine((v) => v === null || /^\+?[0-9 ().-]{6,20}$/.test(v), "Numéro invalide."),
    email: optionalText(254).refine((v) => v === null || z.email().safeParse(v).success, "Email invalide."),
  })
  .refine((m) => m.phone !== null || m.email !== null, { message: "Un numéro WhatsApp ou un email.", path: ["phone"] });

export type NewMember = z.infer<typeof NewMemberSchema>;

export const DomainsSchema = z.object({
  trustDomains: z.array(z.enum(TRUST_DOMAIN_VALUES)).max(TRUST_DOMAIN_VALUES.length),
});

/** Domaines enregistrés : sans doublon, et « Tout » seul s'il est coché. */
export function normalizeDomains<T extends string>(domains: readonly T[]): T[] {
  const unique = [...new Set(domains)];
  return unique.includes("all" as T) ? (["all"] as T[]) : unique;
}
