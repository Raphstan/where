import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PageFrame } from "@/components/shell/page-frame";
import type { ExampleKey } from "@/lib/ask/examples";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("edge");
  return { title: t("title") };
}

/** Lien vers le chat avec une question d'exemple, posée dans la langue de l'interface (`home`, `examples.{clé}`). */
type Href = string | { example: ExampleKey };

/*
 * Cas de la maquette (scrEdge) que WH3RE gère réellement. « Pas de disponibilité » n'y figure pas :
 * WH3RE ne connaît pas les disponibilités (aucune API Ontopo ou Tabit, liens sortants seulement).
 */
type CaseKey = "noResults" | "conflicting" | "closed" | "old" | "cancelled" | "delivery" | "noImport";
type ActionKey = "inContext" | "imports" | "exclusions" | "resumeWithoutImport";

/** Textes : messages/{langue}/edge.json, `cases.{clé}` (en français, mot pour mot depuis la maquette). */
const CASES: readonly { key: CaseKey; href: Href; action: ActionKey }[] = [
  { key: "noResults", href: { example: "beach" }, action: "inContext" },
  { key: "conflicting", href: { example: "bar" }, action: "inContext" },
  { key: "closed", href: { example: "cafe" }, action: "inContext" },
  { key: "old", href: { example: "cafe" }, action: "inContext" },
  { key: "cancelled", href: "/import", action: "imports" },
  { key: "delivery", href: "/import", action: "exclusions" },
  { key: "noImport", href: "/onboarding", action: "resumeWithoutImport" },
];

/* États limites (docs/prototype.html, scrEdge). */
export default function EdgePage() {
  const t = useTranslations("edge");
  const tHome = useTranslations("home");
  const link = (href: Href) =>
    typeof href === "string" ? href : `/chat?q=${encodeURIComponent(tHome(`examples.${href.example}`))}`;
  return (
    <PageFrame
      title={t("title")}
      lead={t("lead")}
      back="/profile"
    >
      {CASES.map((c) => (
        <div key={c.key} className="flex flex-col gap-2 rounded-card border border-line bg-paper-2 p-4">
          <h2 className="text-[15px] font-bold">{t(`cases.${c.key}.title`)}</h2>
          <div className="flex items-start gap-2.5 rounded-[14px] bg-lilac-2 px-3 py-[9px] text-[13.5px] text-ink-2">
            <span aria-hidden>“</span>
            <span>{t(`cases.${c.key}.quote`)}</span>
          </div>
          <p className="text-[12.5px] text-muted">{t(`cases.${c.key}.text`)}</p>
          <Link
            href={link(c.href)}
            className="inline-flex min-h-[30px] items-center self-start rounded-full border-[1.5px] border-line px-[11px] py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink"
          >
            {t(`actions.${c.action}`)}
          </Link>
        </div>
      ))}
    </PageFrame>
  );
}
