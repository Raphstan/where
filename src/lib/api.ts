import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type ErrorBody = { error: { code: string; message: string } };

export function fail(status: number, code: string, message: string) {
  return NextResponse.json<ErrorBody>({ error: { code, message } }, { status });
}

/** Client Supabase porteur de la session (RLS) et utilisateur connecté, ou null. */
export async function authenticated() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, user } : null;
}
