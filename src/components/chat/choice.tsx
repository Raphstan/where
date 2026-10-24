import type { Clarification } from "@/lib/ask/schema";
import { WhereBubble } from "./bubbles";

/** Question de précision à choix (docs/prototype.html, case 'choice'). */
export function ChoiceBubble({
  clarification,
  picked,
  onPick,
}: {
  clarification: Clarification;
  picked: string | null;
  onPick: (option: string) => void;
}) {
  return (
    <WhereBubble>
      <div className="mb-2.5">{clarification.question}</div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={clarification.question}>
        {clarification.options.map((option) => {
          const isPicked = picked === option;
          return (
            <button
              key={option}
              type="button"
              disabled={picked !== null}
              aria-pressed={isPicked}
              onClick={() => onPick(option)}
              className={`inline-flex items-center rounded-full border-[1.5px] px-3.5 py-[9px] text-[13.5px] font-semibold transition-colors disabled:cursor-default ${
                isPicked
                  ? "border-ink bg-ink text-cream"
                  : "border-line bg-cream-2 text-ink hover:border-ink disabled:opacity-50"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </WhereBubble>
  );
}
