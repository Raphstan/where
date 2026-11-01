"use server";

import { GuestReplySchema } from "@/lib/network/reply";
import { submitGuestReply } from "@/lib/network/guest";

export type GuestReplyState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "sent"; reusable: boolean; at: number };

/** Réponse du proche depuis son lien privé, sans compte. Validée par zod, écrite côté serveur. */
export async function sendGuestReply(_prev: GuestReplyState, form: FormData): Promise<GuestReplyState> {
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
    const message =
      issue?.path[0] === "visited"
        ? "Dis-moi si tu y es réellement allé·e."
        : issue?.path[0] === "token"
          ? "Ce lien privé n’est pas valide."
          : (issue?.message ?? "Vérifie ta réponse.");
    return { status: "error", message };
  }

  try {
    const result = await submitGuestReply(parsed.data);
    if (!result.ok) return { status: "error", message: "Ce lien privé n’est plus valide." };
    return { status: "sent", reusable: parsed.data.reusable, at: Date.now() };
  } catch {
    return { status: "error", message: "Ta réponse n’est pas partie. Réessaie dans un instant." };
  }
}
