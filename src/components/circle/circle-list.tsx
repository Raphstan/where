import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import { Mascot } from "@/components/shell/wordmark";
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
  if (members.length === 0) {
    const t = await getTranslations("circle.empty");
    return (
      <div className="flex items-start gap-3.5 rounded-card border-2 border-dashed border-line-strong p-4">
        <Mascot className="h-[42px] w-[36px] shrink-0" />
        <div className="flex flex-col gap-1">
          <div className="font-display text-[17px] font-bold leading-tight">{t("title")}</div>
          <p className="text-[13px] leading-snug text-muted">{t("lead")}</p>
        </div>
      </div>
    );
  }
  return members.map((m) => <PersonCard key={m.id} member={m} />);
}
