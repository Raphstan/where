import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HomeAsk } from "@/components/home/home-ask";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { Wordmark } from "@/components/shell/wordmark";

/* Suggestions affichées sous le champ : libellé court, question complète envoyée au chat. */
const SUGGESTIONS = ["group", "rome", "cafe"] as const;

/* Accueil, aux couleurs de la landing. Les visiteurs connectés vont directement au chat (proxy). */
export default async function Home() {
  const t = await getTranslations("home");
  const suggestions = SUGGESTIONS.map((key) => ({ key, label: t(`chips.${key}`), question: t(`examples.${key}`) }));
  return (
    <main className="hero relative flex min-h-dvh flex-1 flex-col text-ink">
      <header className="flex items-center justify-between px-[22px] pt-[max(16px,env(safe-area-inset-top))] lg:px-10 lg:pt-6">
        <Wordmark />
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link href="/login" className="text-[14px] font-semibold text-ink underline-offset-4 hover:underline">
            {t("signIn")}
          </Link>
        </div>
      </header>
      <div className="flex flex-1 flex-col justify-center gap-6 px-[22px] pt-8 pb-12 lg:mx-auto lg:w-full lg:max-w-[680px] lg:px-8 lg:pb-24">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[38px] leading-[1.04] font-extrabold tracking-[-0.025em] text-balance lg:text-[64px]">
            {t("title1")}
            <br />
            <span className="text-orange">{t("title2")}</span>
          </h1>
          <p className="max-w-[44ch] text-[17px] leading-normal text-pretty text-ink-2">{t("lead")}</p>
        </div>
        <HomeAsk example={t("examples.date")} suggestions={suggestions} />
        <div className="flex flex-col items-stretch gap-3 pt-2 sm:flex-row sm:items-center">
          <Link
            href="/onboarding"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-orange px-7 text-[15px] font-bold text-white transition-colors hover:bg-[#ee4a10]"
          >
            {t("start")}
          </Link>
          <Link href="/how" className="self-center px-3 text-[14px] font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline">
            {t("how")}
          </Link>
        </div>
      </div>
    </main>
  );
}
