import Link from "next/link";
import { useTranslations } from "next-intl";
import { PersonAvatar } from "@/components/results/marks";
import type { SuggestedPerson } from "@/lib/search/types";

/** Proches suggérés quand la confiance est insuffisante (docs/prototype.html, case 'people'). */
export function PeopleSuggestion({ people, askHref }: { people: SuggestedPerson[]; askHref: string | null }) {
  const t = useTranslations("chat");
  return (
    <div className="flex w-full animate-pop flex-col gap-2.5">
      {people.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-[16px] border border-line bg-paper-2 p-3">
          <PersonAvatar person={p} />
          <div>
            <div className="font-bold">{p.name}</div>
            <div className="text-[12.5px] text-muted">{p.reason}</div>
          </div>
        </div>
      ))}
      {askHref ? (
        <Link
          href={askHref}
          className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-orange px-5 text-[14.5px] font-bold text-white shadow-orange transition-colors hover:bg-[#ee4a10]"
        >
          {t("people.ask")}
        </Link>
      ) : null}
      <p className="text-center text-[11.5px] text-soft">
        {t("people.note")}
      </p>
    </div>
  );
}
