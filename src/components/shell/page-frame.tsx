import type { ReactNode } from "react";

/** Gabarit d'une page vide : titre Fraunces, accroche, contenu centré sur desktop (.pad + .desk-wrap). */
export function PageFrame({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <div className="px-[22px] pt-3 pb-7 lg:px-9 lg:pt-7">
      <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3.5">
        <h1 className="font-display text-[28px] font-normal leading-[1.12] tracking-[-0.01em]">
          {title}
        </h1>
        <p className="text-[15px] leading-normal text-muted">{lead}</p>
        {children}
      </div>
    </div>
  );
}
