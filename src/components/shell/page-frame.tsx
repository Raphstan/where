import Link from "next/link";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

/**
 * Gabarit d'une page : titre Fraunces, accroche, contenu centré sur desktop (.pad + .desk-wrap).
 * `back` : bouton retour, sur mobile seulement (maquette : Mes sources et Confidentialité → Profil).
 */
export function PageFrame({
  title,
  lead,
  back,
  wide = false,
  children,
}: {
  title: string;
  lead?: string;
  back?: `/${string}`;
  wide?: boolean;
  children?: ReactNode;
}) {
  const t = useTranslations("common");
  return (
    <div className="px-[22px] pt-3 pb-7 lg:px-9 lg:pt-7">
      <div className={`mx-auto flex w-full flex-col gap-3.5 ${wide ? "max-w-[860px]" : "max-w-[720px]"}`}>
        {back ? (
          <Link
            href={back}
            aria-label={t("back")}
            className="inline-flex size-[34px] items-center justify-center rounded-full bg-lilac-2 text-[18px] lg:hidden rtl:-scale-x-100"
          >
            ‹
          </Link>
        ) : null}
        <h1 className="font-display text-[28px] font-bold leading-[1.12] tracking-[-0.02em]">
          {title}
        </h1>
        {lead ? <p className="text-[15px] leading-normal text-muted">{lead}</p> : null}
        {children}
      </div>
    </div>
  );
}
