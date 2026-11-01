import Link from "next/link";
import type { ReactNode } from "react";
import { EYEBROW, H1, OnbFrame } from "@/components/home/onb-frame";
import { PRIVACY_POLICY_PATH, TERMS_PATH, type LegalDoc } from "@/content/legal";

/** Regroupe les lignes « - … » consécutives en listes, le reste en paragraphes. */
function Body({ lines }: { lines: string[] }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="flex list-disc flex-col gap-1.5 ps-5 marker:text-soft">
        {list.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  for (const line of lines) {
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      continue;
    }
    flush();
    blocks.push(<p key={`p-${blocks.length}`}>{line}</p>);
  }
  flush();
  return <>{blocks}</>;
}

/** CGU et politique de confidentialité : pages publiques, lisibles sans compte. */
export function LegalPage({
  doc,
  updated,
  other,
}: {
  doc: LegalDoc;
  updated: string;
  /** Lien vers l'autre document. */
  other: { kind: "terms" | "privacy"; label: string };
}) {
  return (
    <OnbFrame back="/">
      <div className={EYEBROW}>{updated}</div>
      <h1 className={H1}>{doc.title}</h1>
      <p className="text-[15px] leading-normal text-muted">{doc.intro}</p>
      <div className="flex flex-col gap-6 rounded-card border border-line bg-paper-2 p-5 text-[14px] leading-relaxed text-ink-2 lg:p-7">
        {doc.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h2 className="font-display text-[18px] font-bold leading-tight text-ink">{section.heading}</h2>
            <Body lines={section.body} />
          </section>
        ))}
      </div>
      <Link
        href={other.kind === "terms" ? TERMS_PATH : PRIVACY_POLICY_PATH}
        className="self-center text-[13.5px] font-semibold text-blue hover:underline"
      >
        {other.label}
      </Link>
    </OnbFrame>
  );
}
