import { NextResponse } from "next/server";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { authenticated, fail } from "@/lib/api";
import { deleteAccount } from "@/lib/privacy/store";

/** DELETE /api/account — « Supprimer mon compte » : définitif, puis la session est fermée. */
export async function DELETE() {
  const t = translator(await apiLocale(), "privacy");
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", t("api.unauthenticated"));
  try {
    await deleteAccount(auth.supabase);
  } catch {
    return fail(503, "storage_unavailable", t("api.deleteAccountFailed"));
  }
  // Le compte n'existe plus : on efface seulement les cookies de session, localement.
  await auth.supabase.auth.signOut({ scope: "local" });
  return NextResponse.json({ ok: true });
}
