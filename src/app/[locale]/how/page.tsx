import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ORANGE_BTN, EYEBROW, H1, OnbFrame } from "@/components/home/onb-frame";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("how");
  return { title: t("metaTitle") };
}

/* Les trois étapes ; textes dans messages/{langue}/how.json (`steps.*`). */
const STEPS = ["memory", "ask", "answers"] as const;

/* Dégradés des avatars de la maquette (.av.sarah, .noam, .maya, .me). */
const AV = {
  sarah: "from-[#ff8a5c] to-[#e04a12]",
  noam: "from-[#7d86d8] to-[#3e47a3]",
  maya: "from-[#d6a24f] to-[#9a6a1c]",
  me: "from-ink-2 to-ink",
};

/* Signaux qui flottent vers WH3RE (maquette .conv .src), avec leur position et leur dérive. */
const SIGNALS = [
  { key: "sarah", av: AV.sarah, pos: "start-[6%] top-[12%]", d: "10px,6px", delay: "0s" },
  { key: "noam", av: AV.noam, pos: "end-[6%] top-[18%]", d: "-8px,8px", delay: ".6s" },
  { key: "maya", av: AV.maya, pos: "start-[10%] bottom-[14%]", d: "8px,-8px", delay: "1.2s" },
  { key: "me", av: AV.me, pos: "end-[8%] bottom-[10%]", d: "-10px,-6px", delay: "1.8s" },
] as const;

const CARDS = ["from-[#f2b37a] to-[#d1623f]", "from-[#f6d28c] to-blue", "from-[#8fb8c8] to-[#e8a58a]"];

/* Comment ça marche (docs/prototype.html, scrHow). */
export default function HowPage() {
  const t = useTranslations("how");
  return (
    <OnbFrame back="/">
      <div className={EYEBROW}>{t("eyebrow")}</div>
      <h1 className={H1}>{t("title")}</h1>
      <div className="flex flex-col gap-3.5 lg:flex-row">
        {STEPS.map((step, i) => (
          <div key={step} className="flex flex-1 flex-col gap-2 rounded-[20px] border border-line bg-paper-2 p-[18px]">
            <div className="font-display text-[26px] text-orange">{i + 1}</div>
            <div className="text-[15px] font-bold">{t(`steps.${step}.title`)}</div>
            <p className="text-[12.5px] text-muted">{t(`steps.${step}.text`)}</p>
          </div>
        ))}
      </div>
      <div className="relative h-[230px] overflow-hidden rounded-[22px] bg-night" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,90,31,0.25),transparent_45%)]" />
        {SIGNALS.map((s) => (
          <div
            key={s.key}
            style={{ "--dx": s.d.split(",")[0], "--dy": s.d.split(",")[1], animationDelay: s.delay } as CSSProperties}
            className={`absolute flex animate-drift items-center gap-2 rounded-full border border-white/12 bg-white/8 py-1.5 pe-2.5 ps-1.5 text-[12px] whitespace-nowrap text-paper ${s.pos}`}
          >
            <span className={`inline-flex size-[26px] items-center justify-center rounded-full bg-linear-145 font-display text-[11px] font-bold text-white ${s.av}`}>
              {t(`signals.${s.key}.initial`)}
            </span>
            {t(`signals.${s.key}.text`)}
          </div>
        ))}
        <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-1.5">
          {CARDS.map((c, i) => (
            <i
              key={c}
              style={{ animationDelay: `${i * 0.3}s` }}
              className={`block h-[46px] w-[34px] animate-glow rounded-lg bg-linear-160 shadow-[0_10px_30px_-8px_rgba(241,179,122,0.7)] ${c}`}
            />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-2 text-center text-[11.5px] text-lilac">
          {t("caption")}
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-card bg-night p-4 text-paper">
        <div className={`${EYEBROW} text-lilac`}>{t("promiseEyebrow")}</div>
        <div className="font-display text-[21px] font-bold leading-tight">{t("promise")}</div>
        <p className="text-[12.5px] text-lilac">
          {t("promiseText")}
        </p>
      </div>
      <Link href="/onboarding" className={ORANGE_BTN}>
        {t("start")}
      </Link>
    </OnbFrame>
  );
}
