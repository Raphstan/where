import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";

const intl = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Routes API et arrivée du lien magique : pas de langue, seulement la session.
  if (pathname.startsWith("/api/") || pathname.startsWith("/auth/")) {
    return updateSession(request);
  }
  return updateSession(request, intl(request));
}

export const config = {
  matcher: [
    // Tout sauf les ressources statiques, les images et le manifeste de l'appli installable.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
