import { useTranslations } from "next-intl";

/** « Ce cercle est privé. » (maquette scrCircleSetup). */
export function CircleNotice() {
  const t = useTranslations("circle");
  return (
    <div className="flex items-start gap-2.5 rounded-[14px] bg-lilac-2 px-3.5 py-3 text-[13.5px] text-ink-2">
      <span>{t("notice")}</span>
    </div>
  );
}
