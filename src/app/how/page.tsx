import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { CORAL_BTN, EYEBROW, H1, OnbFrame } from "@/components/home/onb-frame";

export const metadata: Metadata = { title: "Comment ça marche" };

const STEPS = [
  [
    "WHERE retrouve les lieux que toi et tes proches connaissez déjà.",
    "Réservations dans tes emails, lieux partagés, réponses de tes proches. Jamais de lecture secrète.",
  ],
  [
    "Tu poses une question comme tu la poserais à un ami.",
    "« Un endroit caché, pas trop bruyant, pour ce soir. » WHERE comprend le contexte.",
  ],
  [
    "Tu obtiens quelques réponses expliquées, pas une liste infinie.",
    "Trois idées solides, avec qui les recommande et pourquoi.",
  ],
] as const;

/* Dégradés des avatars de la maquette (.av.sarah, .noam, .maya, .me). */
const AV = {
  sarah: "from-[#e58a6f] to-[#b9553f]",
  noam: "from-[#3e7f9f] to-[#1f4f68]",
  maya: "from-[#c8a35a] to-[#8c6a2a]",
  me: "from-ink-2 to-ink",
};

/* Signaux qui flottent vers WHERE (maquette .conv .src), avec leur position et leur dérive. */
const SIGNALS = [
  { ini: "S", av: AV.sarah, text: "Sarah recommande un lieu", pos: "left-[6%] top-[12%]", d: "10px,6px", delay: "0s" },
  { ini: "N", av: AV.noam, text: "Noam y a réservé", pos: "right-[6%] top-[18%]", d: "-8px,8px", delay: ".6s" },
  { ini: "M", av: AV.maya, text: "Maya a partagé une vidéo", pos: "left-[10%] bottom-[14%]", d: "8px,-8px", delay: "1.2s" },
  { ini: "R", av: AV.me, text: "Raphaël a aimé un lieu similaire", pos: "right-[8%] bottom-[10%]", d: "-10px,-6px", delay: "1.8s" },
];

const CARDS = ["from-[#f2b37a] to-[#d1623f]", "from-[#f6d28c] to-blue", "from-[#8fb8c8] to-[#e8a58a]"];

/* Comment ça marche (docs/prototype.html, scrHow). */
export default function HowPage() {
  return (
    <OnbFrame back="/">
      <div className={EYEBROW}>Comment ça marche</div>
      <h1 className={H1}>Trois étapes, pas une appli de plus.</h1>
      <div className="flex flex-col gap-3.5 lg:flex-row">
        {STEPS.map(([title, text], i) => (
          <div key={title} className="flex flex-1 flex-col gap-2 rounded-[20px] border border-line bg-cream-2 p-[18px]">
            <div className="font-display text-[26px] text-coral">{i + 1}</div>
            <div className="text-[15px] font-bold">{title}</div>
            <p className="text-[12.5px] text-muted">{text}</p>
          </div>
        ))}
      </div>
      <div className="relative h-[230px] overflow-hidden rounded-[22px] bg-night" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(223,111,85,0.25),transparent_45%)]" />
        {SIGNALS.map((s) => (
          <div
            key={s.text}
            style={{ "--dx": s.d.split(",")[0], "--dy": s.d.split(",")[1], animationDelay: s.delay } as CSSProperties}
            className={`absolute flex animate-drift items-center gap-2 rounded-full border border-white/12 bg-white/8 py-1.5 pr-2.5 pl-1.5 text-[12px] whitespace-nowrap text-cream ${s.pos}`}
          >
            <span className={`inline-flex size-[26px] items-center justify-center rounded-full bg-linear-145 font-display text-[11px] font-bold text-white ${s.av}`}>
              {s.ini}
            </span>
            {s.text}
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
        <div className="absolute inset-x-0 bottom-2 text-center text-[11.5px] text-[#b9c0cc]">
          Plusieurs signaux de confiance → trois recommandations
        </div>
      </div>
      <div className="flex flex-col gap-1.5 rounded-card bg-night p-4 text-cream">
        <div className={`${EYEBROW} text-[#b9c0cc]`}>La promesse</div>
        <div className="font-display text-[21px] font-medium leading-tight">Ask your network without asking everyone.</div>
        <p className="text-[12.5px] text-[#b9c0cc]">
          Au lieu de fouiller des centaines d’avis anonymes ou d’envoyer la même question dans cinq groupes WhatsApp.
        </p>
      </div>
      <Link href="/onboarding" className={CORAL_BTN}>
        Commencer
      </Link>
    </OnbFrame>
  );
}
