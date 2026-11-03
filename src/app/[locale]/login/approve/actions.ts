"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import {
  LOGIN_REQUEST_COOKIE,
  approveLoginRequest,
  consumeLoginRequest,
  isRequestingBrowser,
} from "@/lib/auth/login-request";
import { NEXT_COOKIE, nextAfterLogin } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  id: z.string().uuid(),
  secret: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  here: z.boolean(),
});

export type ApproveResult = { status: "approved" } | { status: "in"; next: string } | { status: "gone" };

/**
 * « Me connecter » sur la page du lien. Si ce navigateur est celui qui a tapé l'email, ou si la
 * personne choisit « Me connecter ici », la session s'ouvre ici. Sinon la demande est approuvée et
 * la page restée ouverte ailleurs (Safari, l'appli installée) se connecte seule.
 */
export async function approveLogin(input: z.input<typeof schema>): Promise<ApproveResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { status: "gone" };
  const { id, secret, here } = parsed.data;
  const jar = await cookies();

  try {
    const sameBrowser = await isRequestingBrowser(id, jar.get(LOGIN_REQUEST_COOKIE)?.value);
    if (!here && !sameBrowser) {
      return (await approveLoginRequest(id, secret)) ? { status: "approved" } : { status: "gone" };
    }
    const consumed = await consumeLoginRequest(id, secret, "approval");
    if (!consumed) return { status: "gone" };
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: consumed.tokenHash });
    if (error) return { status: "gone" };
    const next = nextAfterLogin(consumed.next, jar.get(NEXT_COOKIE)?.value);
    jar.delete(LOGIN_REQUEST_COOKIE);
    jar.delete(NEXT_COOKIE);
    return { status: "in", next };
  } catch {
    return { status: "gone" };
  }
}
