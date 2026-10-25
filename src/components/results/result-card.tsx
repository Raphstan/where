"use client";

import { usePanel } from "@/components/shell/panel-context";
import { DISCOVERY_TEXT } from "@/lib/search/phrasing";
import type { SearchResult } from "@/lib/search/types";
import { ConfidencePill, EvidenceText, hashIndex, PeopleStack } from "./marks";
import { WhyPanel } from "./why-panel";

const SCENES = 6;
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
  const discovery = result.origin === "discovery";
  const canBook = Boolean(onBook) && result.booking.length > 0;
  const meta = [result.kind, result.vibe.join(", "), result.noise ? `🔈 ${result.noise}` : null, result.price].filter(
    (m): m is string => Boolean(m),
  );

  return (
    <article
      className={`overflow-hidden rounded-[22px] border border-line bg-cream-2 shadow-soft ${discovery ? "border-dashed" : ""}`}
    >
      <div className="relative">
        <span
          className={`absolute top-3 left-3 z-[2] rounded-full px-2.5 py-[5px] text-[11.5px] font-bold tracking-[0.02em] ${
            first && !discovery ? "bg-coral text-white" : "bg-white/90 text-ink"
          }`}
        >
          {result.rank}
        </span>
        <div aria-hidden className={`scene aspect-video max-h-[240px] w-full scene-${hashIndex(result.id, SCENES)}`} />
      </div>

      <div className="flex flex-col gap-2.5 px-4 pt-3.5 pb-4">
        <div>
          <h3 className="font-display text-[22px] font-medium leading-[1.1]">{result.name}</h3>
          {result.area ? <div className="text-[12.5px] text-muted">{result.area}</div> : null}
        </div>

        {meta.length > 0 ? (
          <div className="flex flex-wrap gap-x-2.5 gap-y-1 text-[12.5px] text-muted">
            {meta.map((m, i) => (
              <span key={m} className={i === 0 ? "font-semibold text-ink-2" : "before:mr-2.5 before:text-soft before:content-['·']"}>
                {m}
              </span>
            ))}
          </div>
        ) : null}

        {result.headline ? <p className="text-[14px] leading-[1.4] text-ink">{result.headline}</p> : null}

        <div className="flex flex-col gap-1.5 rounded-[14px] bg-cream px-3 py-2.5">
          {result.lines.slice(0, 3).map((line, i) => (
            <EvidenceText key={i} level={line.kind === "evidence" ? line.level : "deduction"}>
              {line.text}
            </EvidenceText>
          ))}
        </div>

        {result.staleNotice ? (
          <div className="flex items-start gap-2.5 rounded-[14px] bg-amber-2 px-3 py-[9px] text-[13.5px] leading-[1.4] text-[#6e4f14]">
            <span aria-hidden>🕰</span>
            <span>{result.staleNotice}</span>
          </div>
        ) : null}

        {result.conflictNotice ? (
          <div className="flex items-start gap-2.5 rounded-[14px] bg-blue-2 px-3 py-[9px] text-[13.5px] leading-[1.4] text-[#1f4f68]">
            <span aria-hidden>↔</span>
            <span>{result.conflictNotice}</span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <ConfidencePill level={result.confidence.level} text={result.confidence.text} />
          {result.people.length > 0 ? (
            <PeopleStack people={result.people} />
          ) : discovery ? (
            <span className="text-[11.5px] font-bold tracking-[0.06em] text-blue uppercase">
              {DISCOVERY_TEXT.outsideCircle}
            </span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              open({ key: result.id, title: "Pourquoi ce choix ?", body: <WhyPanel result={result} onBook={canBook ? onBook : undefined} /> })
            }
            className={`${ACTION} bg-sand-2 text-ink hover:bg-sand`}
          >
            Pourquoi ce choix ?
          </button>
          {result.links.googleMapsUrl ? (
            <a
              href={result.links.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ACTION} bg-sand-2 text-ink hover:bg-sand`}
            >
              Voir dans Google Maps
            </a>
          ) : null}
          {canBook ? (
            <button type="button" onClick={() => onBook?.(result)} className={`${ACTION} bg-ink text-cream hover:bg-[#0f1722]`}>
              Réserver
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}
