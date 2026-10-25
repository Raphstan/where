import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { EvidenceText, hashIndex } from "@/components/results/marks";
import { PageFrame } from "@/components/shell/page-frame";
import { buildMemory, filterMemory, isMemoryFilter, MEMORY_FILTERS, memoryStats, type MemoryFilter } from "@/lib/memory/memory";
import { loadMemoryRows } from "@/lib/memory/store";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ma mémoire" };

const SCENES = 6;

function Stat({ n, one, many }: { n: number; one: string; many: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-cream-2 p-3.5">
      <b className="font-display text-[28px] font-medium leading-none">{n}</b>
      <span className="text-[12px] text-muted">{n > 1 ? many : one}</span>
    </div>
  );
}

async function Memory({ searchParams }: { searchParams: PageProps<"/memory">["searchParams"] }) {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const raw = (await searchParams).f;
  const filter: MemoryFilter = isMemoryFilter(raw) ? raw : "tous";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await loadMemoryRows(supabase, user.id);
  const all = buildMemory(rows);
  if (all.length === 0) {
    return (
      <div className="rounded-card border border-line bg-cream-2 p-4 shadow-soft">
        <p className="text-[12.5px] text-muted">
          Ta mémoire est encore vide. Elle se remplira avec tes réservations, tes retours et les réponses de ton cercle.
        </p>
        <Link href="/import" className="mt-2 inline-block text-[12.5px] font-semibold text-blue hover:underline">
          Retrouver mes anciennes réservations →
        </Link>
      </div>
    );
  }

  const stats = memoryStats(rows);
  const items = filterMemory(all, filter);
  return (
    <>
      <div className="grid grid-cols-3 gap-2.5">
        <Stat n={stats.visited} one="lieu visité" many="lieux visités" />
        <Stat n={stats.recosReceived} one="reco reçue" many="recos reçues" />
        <Stat n={stats.cities} one="ville" many="villes" />
      </div>

      <nav aria-label="Filtrer" className="-mx-[22px] flex gap-2 overflow-x-auto px-[22px] pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0">
        {MEMORY_FILTERS.map(([k, label]) => (
          <Link
            key={k}
            href={k === "tous" ? "/memory" : `/memory?f=${k}`}
            scroll={false}
            aria-current={filter === k ? "page" : undefined}
            className={`inline-flex shrink-0 items-center rounded-full border-[1.5px] px-3 py-[7px] text-[13px] font-semibold transition-colors ${
              filter === k ? "border-ink bg-ink text-cream" : "border-line bg-cream-2 text-ink hover:border-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        {items.map((i) => (
          <article key={i.placeId} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-cream-2">
            <div aria-hidden className={`scene aspect-[4/3] scene-${hashIndex(i.placeId, SCENES)}`} />
            <div className="flex flex-col gap-1 px-3 pt-2.5 pb-3">
              <div className="text-[13.5px] font-bold">{i.name}</div>
              {i.city ? <div className="text-[11.5px] text-muted">{i.city}</div> : null}
              <EvidenceText level={i.level}>{i.label}</EvidenceText>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

/* Ma mémoire (docs/prototype.html, scrMemory). */
export default function MemoryPage({ searchParams }: PageProps<"/memory">) {
  return (
    <PageFrame title="Ma mémoire" wide>
      <Suspense fallback={<div className="h-[260px] animate-pulse rounded-card border border-line bg-cream-2" />}>
        <Memory searchParams={searchParams} />
      </Suspense>
      <p className="text-center text-[11.5px] text-soft">
        Cette section reste secondaire. Le chat demeure le point d&apos;entrée.
      </p>
    </PageFrame>
  );
}
