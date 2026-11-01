import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { HomeAsk } from "@/components/home/home-ask";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { Mascot, Wordmark } from "@/components/shell/wordmark";
import { EXAMPLE_QUESTIONS } from "@/lib/ask/examples";

/* Accueil (docs/prototype.html, scrHome), aux couleurs de la landing. Les visiteurs connectés vont directement au chat (proxy). */
export default async function Home() {
  const t = await getTranslations("home");
  const [first, ...others] = EXAMPLE_QUESTIONS.map((ex) => ({ key: ex.key, text: t(`examples.${ex.key}`) }));
  return (
    <main className="hero relative flex min-h-dvh flex-1 flex-col overflow-hidden text-ink">
      <header className="relative flex items-center justify-between px-[22px] pt-[max(16px,env(safe-area-inset-top))] lg:px-10 lg:pt-6">
        <Wordmark />
        <LanguageSwitcher />
      </header>
      <div className="relative flex flex-col gap-5 px-[22px] pt-10 pb-10 lg:mx-auto lg:w-full lg:max-w-[760px] lg:px-8 lg:pt-16 lg:pb-[60px]">
        <div className="relative">
          <h1 className="font-display text-[44px] leading-[1.02] font-extrabold tracking-[-0.02em] lg:text-[72px]">
            {t("title1")}
            <br />
            <em className="text-orange not-italic">{t("title2")}</em>
          </h1>
          <Mascot className="animate-glow absolute -top-3 end-0 h-[70px] w-[60px] lg:-top-6 lg:end-6 lg:h-[110px] lg:w-[94px]" />
        </div>
        <p className="max-w-[40ch] text-[17px] leading-normal text-ink-2">
          {t("lead")}
        </p>
        <HomeAsk example={first.text} others={others} />
        <div className="mt-1.5 flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <Link
            href="/onboarding"
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-orange px-7 text-[15px] font-bold text-white shadow-orange transition-[transform,background-color] hover:-translate-y-px hover:bg-[#ee4a10]"
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
