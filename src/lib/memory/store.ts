import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isReservation, type ReservationKind } from "@/lib/inbound/rules";
import type { Database } from "@/lib/supabase/database.types";
import type { MemorySignalRow } from "./memory";

type Client = SupabaseClient<Database>;

/** Au-delà, la mémoire est lue par pages : largement suffisant pour le MVP. */
const MEMORY_LIMIT = 1000;

/**
 * Toute la mémoire de l'utilisateur, sous RLS : ses signaux et ceux attribués à son cercle.
 * La page « Ma mémoire » montre tout, même ce que les interrupteurs de confidentialité retirent
 * des recommandations.
 */
export async function loadMemoryRows(supabase: Client, userId: string): Promise<MemorySignalRow[]> {
  const [signals, imports] = await Promise.all([
    supabase
      .from("signals")
      .select("evidence_level, created_at, source_member_id, place:places!inner ( id, name, city, kind ), member:circle_members ( id, name )")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(MEMORY_LIMIT),
    supabase.from("forwarded_emails").select("place_id, kind").eq("status", "qualified").not("place_id", "is", null),
  ]);
  if (signals.error) throw new Error(signals.error.message);
  if (imports.error) throw new Error(imports.error.message);

  const importedKind = new Map<string, ReservationKind>();
  for (const e of imports.data) if (e.place_id && isReservation(e.kind)) importedKind.set(e.place_id, e.kind);

  // Un signal attribué à un proche retiré du cercle n'est plus lisible : il n'apparaît pas.
  return signals.data.flatMap((s) =>
    s.source_member_id !== null && !s.member
      ? []
      : [
          {
            place: { id: s.place.id, name: s.place.name, city: s.place.city, kind: s.place.kind },
            level: s.evidence_level,
            member: s.member ? { id: s.member.id, name: s.member.name } : null,
            createdAt: new Date(s.created_at),
            imported: importedKind.get(s.place.id) ?? null,
          },
        ],
  );
}
