import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ProfileHead } from "@/components/profile/profile-head";
import { ChatIcon, LockIcon, SourcesIcon } from "@/components/shell/icons";
import { loadProfile } from "@/lib/profile/store";
import { createClient } from "@/lib/supabase/server";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { LegalLinks } from "@/components/legal/legal-links";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("title") };
}

const CARD = "rounded-card border border-line bg-paper-2 p-4";
const EYEBROW = "mb-2 text-[13px] font-semibold text-muted";

/* docs/prototype.html, scrProfile : le profil mène aux sources, à la confidentialité, aux états limites. */
const LINKS = [
  ["/sources", "sources", SourcesIcon],
  ["/privacy", "privacy", LockIcon],
  ["/onboarding", "onboarding", ChatIcon],
] as const;

async function Profile() {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const profile = await loadProfile(supabase, user.id);
  if (!profile) return null;
  const t = await getTranslations("profile");
  const tc = await getTranslations("common");

  return (
    <>
      <ProfileHead name={profile.name} city={profile.city} email={profile.email} />

      <div className={CARD}>
        <div className={EYEBROW}>{t("preferences.title")}</div>
        {profile.preferences.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {profile.preferences.map((p) => (
              <span key={p} className="inline-flex rounded-full border-[1.5px] border-line bg-paper-2 px-3 py-[7px] text-[12px] font-medium">
                {p}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12.5px] text-muted">
            {t("preferences.empty")}
          </p>
        )}
      </div>

      <nav className="flex flex-col">
        {LINKS.map(([href, key, Icon]) => (
          <Link key={href} href={href} className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
            <Icon className="size-[22px] text-muted" />
            <span className="grow font-semibold">{t(`links.${key}`)}</span>
            <span aria-hidden className="text-soft inline-block rtl:-scale-x-100">
              ›
            </span>
          </Link>
        ))}
      </nav>

      <div className={CARD}>
        <div className={EYEBROW}>{t("account.title")}</div>
        <div className="flex items-center justify-between gap-3 py-[11px] text-[13.5px]">
          <span className="text-muted">{t("account.email")}</span>
          <span className="truncate">{profile.email}</span>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line py-[7px] text-[13.5px]">
          <span className="text-muted">{tc("language")}</span>
          <LanguageSwitcher />
        </div>
        <form action="/auth/signout" method="post" className="mt-2">
          <button
            type="submit"
            className="inline-flex min-h-9 w-full items-center justify-center rounded-full border-[1.5px] border-line px-3.5 text-[13px] font-bold text-ink transition-colors hover:border-ink"
          >
            {t("account.signOut")}
          </button>
        </form>
      </div>
      <LegalLinks className="pt-1" />
    </>
  );
}

/* Profil (docs/prototype.html, scrProfile). */
export default function ProfilePage() {
  return (
    <div className="px-[22px] pt-3 pb-7 lg:px-9 lg:pt-7">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3.5">
        <Suspense fallback={<div className="h-[320px] animate-pulse rounded-card border border-line bg-paper-2" />}>
          <Profile />
        </Suspense>
      </div>
    </div>
  );
}
