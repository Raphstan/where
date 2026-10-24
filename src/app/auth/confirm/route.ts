import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

const otpTypes = ["magiclink", "email", "signup", "recovery", "invite", "email_change"] as const;

const querySchema = z.object({
  token_hash: z.string().min(1).optional(),
  type: z.enum(otpTypes).optional(),
  code: z.string().min(1).optional(),
  next: z.string().optional(),
});

/**
 * Point d'arrivée du lien magique.
 * - token_hash + type : template d'email personnalisé (supabase/templates/magic_link.html).
 * - code : flux PKCE par défaut de Supabase, au cas où le template n'est pas installé.
 */
export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = querySchema.safeParse(params);
  const next = safeNextPath(parsed.success ? parsed.data.next : null);

  const fail = () => NextResponse.redirect(new URL("/login?error=link", request.url));
  if (!parsed.success) return fail();

  const supabase = await createClient();
  const { token_hash, type, code } = parsed.data;

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type: type as EmailOtpType, token_hash });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
    return fail();
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return fail();
}
