import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { EvidenceText } from "@/components/results/marks";
import { PageFrame } from "@/components/shell/page-frame";
import { buildMemory, filterMemory, isMemoryFilter, MEMORY_FILTERS, memoryStats, type MemoryFilter } from "@/lib/memory/memory";
import { loadMemoryRows } from "@/lib/memory/store";
import { createClient } from "@/lib/supabase/server";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("memory");
  return { title: t("title") };
}


/** Un chiffre de la maquette : `<n>` le nombre, `<l>` son libellé, accordé selon la langue. */
const STAT_TAGS = {
  n: (chunks: ReactNode) => <b className="font-display text-[28px] font-bold leading-none">{chunks}</b>,
  l: (chunks: ReactNode) => <span className="text-[12px] text-muted">{chunks}</span>,
};

function Stat({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-0.5 rounded-2xl border border-line bg-paper-2 p-3.5">{children}</div>;
}

async function Memory({ searchParams }: { searchParams: PageProps<"/[locale]/memory">["searchParams"] }) {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const raw = (await searchParams).f;
  const filter: MemoryFilter = isMemoryFilter(raw) ? raw : "tous";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const t = await getTranslations("memory");
  const rows = await loadMemoryRows(supabase, user.id);
  const all = buildMemory(rows, await getTranslations("evidence"));
  if (all.length === 0) {
    return (
      <div className="rounded-card border border-line bg-paper-2 p-4 shadow-soft">
        <p className="text-[12.5px] text-muted">
          {t("empty")}
        </p>
        <Link href="/import" className="mt-2 inline-block text-[12.5px] font-semibold text-blue hover:underline">
          {t("emptyImport")}
        </Link>
      </div>
    );
  }

  const stats = memoryStats(rows);
  const items = filterMemory(all, filter);
  return (
    <>
      <div className="grid grid-cols-3 gap-2.5">
        <Stat>{t.rich("stats.visited", { count: stats.visited, ...STAT_TAGS })}</Stat>
        <Stat>{t.rich("stats.recosReceived", { count: stats.recosReceived, ...STAT_TAGS })}</Stat>
        <Stat>{t.rich("stats.cities", { count: stats.cities, ...STAT_TAGS })}</Stat>
      </div>

      <nav aria-label={t("filterAria")} className="-mx-[22px] flex gap-2 overflow-x-auto px-[22px] pb-1 [scrollbar-width:none] lg:mx-0 lg:px-0">
        {MEMORY_FILTERS.map((k) => (
          <Link
            key={k}
            href={k === "tous" ? "/memory" : `/memory?f=${k}`}
            scroll={false}
            aria-current={filter === k ? "page" : undefined}
            className={`inline-flex shrink-0 items-center rounded-full border-[1.5px] px-3 py-[7px] text-[13px] font-semibold transition-colors ${
              filter === k ? "border-ink bg-ink text-paper" : "border-line bg-paper-2 text-ink hover:border-ink"
            }`}
          >
            {t(`filters.${k}`)}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        {items.map((i) => (
          <article key={i.placeId} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-paper-2">
            <div className="flex flex-col gap-1 px-3.5 pt-3 pb-3.5">
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
export default function MemoryPage({ searchParams }: PageProps<"/[locale]/memory">) {
  const t = useTranslations("memory");
  return (
    <PageFrame title={t("title")} wide>
      <Suspense fallback={<div className="h-[260px] animate-pulse rounded-card border border-line bg-paper-2" />}>
        <Memory searchParams={searchParams} />
      </Suspense>
    </PageFrame>
  );
}
