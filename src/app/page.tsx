import Link from "next/link";
import { HomeAsk } from "@/components/home/home-ask";
import { EXAMPLE_QUESTIONS } from "@/lib/ask/examples";

/* Accueil (docs/prototype.html, scrHome). Les visiteurs connectés vont directement au chat (proxy). */
export default function Home() {
  const [first, ...others] = EXAMPLE_QUESTIONS;
  return (
    <main className="hero relative flex min-h-dvh flex-1 flex-col overflow-hidden text-cream">
      <div aria-hidden className="hero-stars absolute inset-0" />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-[34%] bg-linear-to-b from-transparent to-blue/35" />
      <div className="relative flex flex-col gap-[22px] px-[22px] pt-[max(70px,env(safe-area-inset-top))] pb-10 lg:mx-auto lg:w-full lg:max-w-[820px] lg:px-8 lg:pt-[70px] lg:pb-[60px] lg:text-center">
        <div className="font-display text-[15px] tracking-[0.18em]">WHERE</div>
        <h1 className="font-display text-[34px] font-normal leading-[1.08] tracking-[-0.01em] lg:text-[56px]">
          Où devrais-tu
          <br />
          vraiment aller ?
        </h1>
        <p className="text-[15px] leading-normal text-[#c8cfda]">
          Trouve des lieux recommandés par les personnes auxquelles tu fais confiance.
        </p>
        <HomeAsk example={first.text} />
        <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:justify-center">
          {others.map((ex) => (
            <Link
              key={ex.key}
              href={`/chat?q=${encodeURIComponent(ex.text)}`}
              className="rounded-[14px] border border-white/12 bg-white/7 px-3.5 py-[11px] text-left text-[13.5px] text-cream transition-colors hover:bg-white/14"
            >
              {ex.text}
            </Link>
          ))}
        </div>
        <div className="mt-1.5 flex flex-col gap-2.5">
          <Link
            href="/onboarding"
            className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-coral px-5 text-[14.5px] font-bold text-white transition-colors hover:bg-[#d2644b] lg:mx-auto lg:w-full lg:max-w-[680px]"
          >
            Commencer
          </Link>
          <Link href="/how" className="self-center text-[13.5px] font-semibold text-[#c8cfda] hover:underline">
            Voir comment ça marche →
          </Link>
        </div>
      </div>
    </main>
  );
}
