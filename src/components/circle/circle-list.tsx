import { connection } from "next/server";
import { listCircle } from "@/lib/circle/store";
import { createClient } from "@/lib/supabase/server";
import { PersonCard } from "./person-card";

/** Les personnes du cercle, lues sous RLS à la requête. */
export async function CircleList() {
  // Rendu à la requête : la session vit dans les cookies.
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const members = await listCircle(supabase, user.id);
  return members.map((m) => <PersonCard key={m.id} member={m} />);
}

export const CIRCLE_LEAD =
  "Une personne n’est pas forcément pertinente pour tous les sujets. Choisis sur quoi tu fais confiance à chacun.";
