import { NextResponse } from "next/server";
import { authenticated, fail } from "@/lib/api";
import { isMemberError, NewMemberSchema } from "@/lib/circle/member";
import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { addMember } from "@/lib/circle/store";

/** POST /api/circle — « Ajouter une personne ». Aucun message n'est envoyé à la personne. */
export async function POST(request: Request) {
  const t = translator(await apiLocale(), "circle");
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", t("api.unauthenticated"));

  const parsed = NewMemberSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const key = parsed.error.issues[0]?.message;
    return fail(400, "invalid_member", isMemberError(key) ? t(`api.${key}`) : t("api.checkFields"));
  }

  try {
    const id = await addMember(auth.supabase, auth.user.id, parsed.data);
    return NextResponse.json({ id }, { status: 201 });
  } catch {
    return fail(503, "storage_unavailable", t("api.saveMemberFailed"));
  }
}
