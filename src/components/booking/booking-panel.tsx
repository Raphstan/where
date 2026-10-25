import { bookingNotes, BOOKING_TEXT, type BookingOption } from "@/lib/booking/options";
import type { SearchResult } from "@/lib/search/types";
import { PlatformLogo } from "./platform-logo";

/**
 * Feuille « Réserver » (docs/prototype.html, bookBody) : uniquement les moyens réellement
 * disponibles pour ce lieu. Choisir un moyen ouvre l'écran « Tu quittes WHERE ».
 */
export function BookingPanel({ result, onChoose }: { result: SearchResult; onChoose: (option: BookingOption) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="font-display text-[20px] leading-tight">{result.name}</div>
        {result.area ? <div className="text-[12.5px] text-muted">{result.area}</div> : null}
      </div>
      <p className="text-[12.5px] text-muted">{BOOKING_TEXT.intro}</p>
      <div className="flex flex-col gap-2">
        {result.booking.map((option) => (
          <button
            key={option.kind}
            type="button"
            onClick={() => onChoose(option)}
            className="flex w-full items-center gap-3.5 rounded-[18px] border-[1.5px] border-line bg-cream-2 px-3.5 py-3 text-left transition hover:-translate-y-px hover:border-ink"
          >
            <PlatformLogo kind={option.kind} />
            <span className="font-bold">{option.label}</span>
            <span aria-hidden className="ml-auto text-soft">
              ›
            </span>
          </button>
        ))}
      </div>
      {bookingNotes(result.booking).map((note) => (
        <p key={note} className="text-[11.5px] text-soft">
          {note}
        </p>
      ))}
    </div>
  );
}
