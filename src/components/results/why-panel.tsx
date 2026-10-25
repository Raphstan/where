import { EVIDENCE_REMINDER } from "@/lib/search/phrasing";
import type { SearchResult } from "@/lib/search/types";
import { ConfidencePill, EvidenceText, PersonAvatar } from "./marks";

const EYEBROW = "text-[11px] font-bold tracking-[0.14em] text-muted uppercase";

/** « Pourquoi ce choix ? » (docs/prototype.html, whyBody). */
export function WhyPanel({ result }: { result: SearchResult }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="font-display text-[20px] leading-tight">{result.name}</div>
        {result.area ? <div className="text-[12.5px] text-muted">{result.area}</div> : null}
      </div>

      <div>
        <ConfidencePill level={result.confidence.level} text={result.confidence.text} />
      </div>

      <section>
        <h3 className={`${EYEBROW} mb-2`}>Cette recommandation repose sur</h3>
        <ul className="flex flex-col">
          {result.lines.map((line, i) => (
            <li key={i} className="flex items-start gap-3 border-t border-line py-3 first:border-t-0">
              {line.person ? (
                <PersonAvatar person={line.person} />
              ) : (
                <span
                  aria-hidden
                  className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-full bg-sand text-[13px] text-muted"
                >
                  {line.kind === "evidence" && line.level === "public" ? "🌐" : "✦"}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{line.text}</div>
                <div className="text-[12.5px] text-muted">
                  {line.label} · {line.provenance}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {result.unknowns.length > 0 ? (
        <section>
          <h3 className={`${EYEBROW} mb-2`}>Ce que nous ne savons pas encore</h3>
          <ul className="flex flex-col gap-1.5">
            {result.unknowns.map((u) => (
              <li
                key={u}
                className="flex items-start gap-2.5 rounded-[14px] bg-sand-2 px-3 py-[9px] text-[13.5px] leading-[1.4] text-ink-2"
              >
                <span aria-hidden className="shrink-0">
                  ?
                </span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-card border border-line bg-cream-2 p-3">
        <h3 className={`${EYEBROW} mb-2`}>Niveaux de preuve</h3>
        <ol>
          {EVIDENCE_REMINDER.map((r, i) => (
            <li key={r.level} className="flex items-center gap-2.5 border-b border-line py-2.5 text-[13.5px] last:border-b-0">
              <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-sand-2 text-[11px] font-bold">
                {i + 1}
              </span>
              <EvidenceText level={r.level}>{r.label}</EvidenceText>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
