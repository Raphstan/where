import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticated, fail } from "@/lib/api";
import { DomainsSchema } from "@/lib/circle/member";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { setDomains } from "@/lib/circle/store";

/** PATCH /api/circle/{id} — domaines de confiance d'une personne du cercle. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/circle/[id]">) {
  const t = translator(await apiLocale(), "circle");
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", t("api.unauthenticated"));

  const id = z.guid().safeParse((await ctx.params).id);
  if (!id.success) return fail(404, "not_found", t("api.notFound"));
  const parsed = DomainsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_domains", t("api.invalidDomains"));

  try {
    const found = await setDomains(auth.supabase, id.data, parsed.data.trustDomains);
    if (!found) return fail(404, "not_found", t("api.notFound"));
    return NextResponse.json({ ok: true });
  } catch {
    return fail(503, "storage_unavailable", t("api.saveChoiceFailed"));
  }
}
