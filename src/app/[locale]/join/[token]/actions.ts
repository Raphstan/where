"use server";

import { z } from "zod";
import { TRUST_DOMAIN_VALUES } from "@/lib/circle/domains";
import { claimGuestMemory, requesterOfToken, type ClaimResult } from "@/lib/network/guest";
import { createClient } from "@/lib/supabase/server";

/** « Garder ma mémoire WH3RE », une fois connecté par le lien magique. */
export async function claimMemory(token: string): Promise<ClaimResult | { ok: false; reason: "unauthenticated" | "unavailable" }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "unauthenticated" };
  try {
    return await claimGuestMemory(token, user.id);
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

const AddRequesterSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{32}$/),
  domains: z.array(z.enum(TRUST_DOMAIN_VALUES)).max(TRUST_DOMAIN_VALUES.length),
  fallbackName: z.string().trim().min(1).max(60),
});

/**
 * Ajoute le demandeur au cercle du proche, seulement sur son clic (décision du 2026-11-01 : proposé,
 * jamais d'office). Le demandeur n'en est pas informé (CLAUDE.md § 2.1). L'écriture passe par RLS.
 */
export async function addRequesterToCircle(input: z.input<typeof AddRequesterSchema>): Promise<{ ok: boolean }> {
  const parsed = AddRequesterSchema.safeParse(input);
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const requester = await requesterOfToken(parsed.data.token);
  if (!requester || requester.userId === user.id) return { ok: false };

  const existing = await supabase
    .from("circle_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("member_id", requester.userId)
    .maybeSingle();
  if (existing.error) return { ok: false };
  if (existing.data) {
    const updated = await supabase.from("circle_members").update({ trust_domains: parsed.data.domains }).eq("id", existing.data.id);
    return { ok: !updated.error };
  }
  const inserted = await supabase.from("circle_members").insert({
    user_id: user.id,
    member_id: requester.userId,
    name: requester.name ?? parsed.data.fallbackName,
    trust_domains: parsed.data.domains,
  });
  return { ok: !inserted.error };
}
