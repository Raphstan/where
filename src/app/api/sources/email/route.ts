import { NextResponse } from "next/server";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { authenticated, fail } from "@/lib/api";
import { deleteEmailSource, restoreEmailSource } from "@/lib/privacy/store";

/** DELETE /api/sources/email — supprime l'adresse de transfert et les emails reçus. Les lieux restent. */
export async function DELETE() {
  const t = translator(await apiLocale(), "sources");
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", t("api.unauthenticated"));
  try {
    await deleteEmailSource(auth.supabase, auth.user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return fail(503, "storage_unavailable", t("api.deleteFailed"));
  }
}

/** POST /api/sources/email — rétablit la source, avec une nouvelle adresse. */
export async function POST() {
  const t = translator(await apiLocale(), "sources");
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", t("api.unauthenticated"));
  try {
    await restoreEmailSource(auth.supabase, auth.user.id);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return fail(503, "storage_unavailable", t("api.connectFailed"));
  }
}
