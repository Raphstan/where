import { NextResponse, type NextRequest } from "next/server";
import { authenticated, fail } from "@/lib/api";
import { CreateBookingSchema } from "@/lib/booking/followup";
import { BookingError, recordBooking } from "@/lib/booking/store";

/**
 * POST /api/bookings — l'utilisateur revient d'un lien sortant et répond « Oui » à « As-tu réservé
 * chez X ? ». Crée un signal `booked` (jamais `visited`) et le suivi du lendemain.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticated();
  if (!auth) return fail(401, "unauthenticated", "Connecte-toi pour continuer.");

  const parsed = CreateBookingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid_request", "Lieu invalide.");

  try {
    const { followupId, created } = await recordBooking(auth.supabase, auth.user.id, parsed.data);
    return NextResponse.json({ followupId }, { status: created ? 201 : 200 });
  } catch (error) {
    if (error instanceof BookingError && error.code === "not_found") return fail(404, "not_found", "Lieu introuvable.");
    return fail(503, "storage_unavailable", "Je n’arrive pas à enregistrer ta réservation.");
  }
}
