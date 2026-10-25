import Link from "next/link";
import { PersonAvatar } from "@/components/results/marks";
import type { SuggestedPerson } from "@/lib/search/types";

/** Proches suggérés quand la confiance est insuffisante (docs/prototype.html, case 'people'). */
export function PeopleSuggestion({ people, askHref }: { people: SuggestedPerson[]; askHref: string | null }) {
  return (
    <div className="flex w-full animate-pop flex-col gap-2.5">
      {people.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-[16px] border border-line bg-cream-2 p-3">
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
          className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-coral px-5 text-[14.5px] font-bold text-white transition-colors hover:bg-[#d2644b]"
        >
          Leur demander
        </Link>
      ) : null}
      <p className="text-center text-[11.5px] text-soft">
        Tu demandes seulement aux personnes les plus pertinentes, pas à tout ton carnet d’adresses.
      </p>
    </div>
  );
}
