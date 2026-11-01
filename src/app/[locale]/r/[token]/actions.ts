"use server";

import { apiLocale } from "@/i18n/request-locale";
import { translator } from "@/i18n/translator";
import { GuestReplySchema } from "@/lib/network/reply";
import { loadGuestMemory, submitGuestReply, type GuestMemory } from "@/lib/network/guest";

export type GuestReplyState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "sent"; reusable: boolean; at: number };

/** Réponse du proche depuis son lien privé, sans compte. Validée par zod, écrite côté serveur. */
export async function sendGuestReply(_prev: GuestReplyState, form: FormData): Promise<GuestReplyState> {
  // Même règle que la page : cookie du proche, sinon Accept-Language.
  const t = translator(await apiLocale(), "guest");
  const parsed = GuestReplySchema.safeParse({
    token: form.get("token"),
    placeName: form.get("placeName") ?? "",
    placeUrl: form.get("placeUrl") ?? "",
    visited: form.get("visited") ?? undefined,
    note: form.get("note") ?? "",
    visibleOnlyToRequester: form.get("visibleOnlyToRequester") === "1",
    reusable: form.get("reusable") === "1",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    // Les messages du schéma sont des clés (`errors.*`), sauf ceux que zod produit lui-même.
    const code =
      issue?.path[0] === "visited"
        ? "visitedRequired"
        : issue?.path[0] === "token"
          ? "invalidToken"
          : issue?.message === "placeNameRequired" || issue?.message === "placeUrlInvalid"
            ? issue.message
            : "checkAnswer";
    return { status: "error", message: t(`errors.${code}`) };
  }

  try {
    const result = await submitGuestReply(parsed.data);
    if (!result.ok) return { status: "error", message: t("errors.expired") };
    return { status: "sent", reusable: parsed.data.reusable, at: Date.now() };
  } catch {
    return { status: "error", message: t("errors.sendFailed") };
  }
}

/** « Voir mes recommandations » : ce que ce proche a déjà recommandé au demandeur, toujours sans compte. */
export async function loadMyAnswers(token: string): Promise<GuestMemory | null> {
  try {
    return await loadGuestMemory(token);
  } catch {
    return null;
  }
}
