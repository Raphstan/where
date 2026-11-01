"use client";

import { useTranslations } from "next-intl";
import { usePanel } from "@/components/shell/panel-context";
import type { SearchResult } from "@/lib/search/types";
import { ConfidencePill, EvidenceText, PeopleStack } from "./marks";
import { WhyPanel } from "./why-panel";

const ACTION = "inline-flex min-h-[30px] items-center rounded-full px-[11px] text-[12.5px] font-semibold transition-colors";

/** Carte résultat (docs/prototype.html, resCard). La découverte est en pointillés, hors du cercle. */
export function ResultCard({
  result,
  first,
  onBook,
}: {
  result: SearchResult;
  first: boolean;
  /** Ouvre la feuille « Réserver ». Absent : pas de bouton. */
  onBook?: (result: SearchResult) => void;
}) {
  const { open } = usePanel();
  const t = useTranslations("results");
  const discovery = result.origin === "discovery";
  const canBook = Boolean(onBook) && result.booking.length > 0;
  const meta = [result.kind, result.vibe.join(", "), result.noise ?? null, result.price].filter(
    (m): m is string => Boolean(m),
  );

  return (
    <article
      className={`overflow-hidden rounded-[22px] border border-line bg-paper-2 shadow-soft ${discovery ? "border-dashed" : ""}`}
    >
      <div className="flex flex-col gap-2.5 px-4 pt-4 pb-4">
        <div className="flex flex-col items-start gap-2">
          <span
            className={`rounded-full px-2.5 py-[5px] text-[11.5px] font-bold ${
              first && !discovery ? "bg-orange text-white" : "bg-lilac-2 text-ink"
            }`}
          >
            {result.rank}
          </span>
          <h3 className="font-display text-[22px] font-bold leading-[1.1]">{result.name}</h3>
          {result.area ? <div className="text-[12.5px] text-muted">{result.area}</div> : null}
        </div>

        {meta.length > 0 ? (
          <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[12.5px] text-muted">
            {meta.map((m, i) => (
              <span key={m} className={i === 0 ? "font-semibold text-ink-2" : "before:me-2.5 before:text-soft before:content-['·']"}>
                {m}
              </span>
            ))}
          </div>
        ) : null}

        {result.headline ? <p className="text-[14px] leading-[1.4] text-ink">{result.headline}</p> : null}

        <div className="flex flex-col gap-1.5 rounded-[14px] bg-paper px-3 py-2.5">
          {result.lines.slice(0, 3).map((line, i) => (
            <EvidenceText key={i} level={line.kind === "evidence" ? line.level : "deduction"}>
              {line.text}
            </EvidenceText>
          ))}
        </div>

        {result.staleNotice ? (
          <div className="flex items-start gap-2.5 rounded-[14px] bg-amber-2 px-3 py-[9px] text-[13.5px] leading-[1.4] text-[#6e4f14]">
            <span>{result.staleNotice}</span>
          </div>
        ) : null}

        {result.conflictNotice ? (
          <div className="flex items-start gap-2.5 rounded-[14px] bg-blue-2 px-3 py-[9px] text-[13.5px] leading-[1.4] text-[#2c3a8c]">
            <span>{result.conflictNotice}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <ConfidencePill level={result.confidence.level} text={result.confidence.text} />
          {result.people.length > 0 ? (
            <PeopleStack people={result.people} />
          ) : discovery ? (
            <span className="text-[12.5px] font-bold text-blue">
              {t("outsideCircle")}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              open({ key: result.id, title: t("why"), body: <WhyPanel result={result} onBook={canBook ? onBook : undefined} /> })
            }
            className={`${ACTION} bg-lilac-2 text-ink hover:bg-lilac`}
          >
            {t("why")}
          </button>
          {result.links.googleMapsUrl ? (
            <a
              href={result.links.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ACTION} bg-lilac-2 text-ink hover:bg-lilac`}
            >
              {t("maps")}
            </a>
          ) : null}
          {canBook ? (
            <button type="button" onClick={() => onBook?.(result)} className={`${ACTION} bg-ink text-paper hover:bg-night`}>
              {t("book")}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
