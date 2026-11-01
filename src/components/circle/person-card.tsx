"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { call, useErrorText } from "@/components/privacy/confirm-sheet";
import { PersonAvatar } from "@/components/results/marks";
import { useToast } from "@/components/shell/toast";
import { TRUST_DOMAINS, toggleDomain, type TrustDomain } from "@/lib/circle/domains";
import type { CircleMemberView } from "@/lib/circle/store";

/** Une personne du cercle et ses domaines de confiance cochables (maquette .person, togDom). */
export function PersonCard({ member }: { member: CircleMemberView }) {
  const [domains, setDomains] = useState<TrustDomain[]>(member.trustDomains);
  const toast = useToast();
  const t = useTranslations("circle");
  const errorText = useErrorText();
  const initial = member.name.trim().charAt(0).toLocaleUpperCase(useLocale());

  function toggle(d: TrustDomain) {
    const before = domains;
    const next = toggleDomain(domains, d);
    setDomains(next);
    call(`/api/circle/${member.id}`, "PATCH", { trustDomains: next }).catch((e: unknown) => {
      setDomains(before);
      toast.show(errorText(e));
    });
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-card border border-line bg-paper-2 p-3.5">
      <div className="flex items-center gap-2.5">
        <PersonAvatar person={{ id: member.id, name: member.name, initial }} size="lg" />
        <div className="min-w-0 grow">
          <h2 className="text-[15px] font-bold">{member.name}</h2>
          {member.description ? <div className="text-[12.5px] text-muted">{member.description}</div> : null}
        </div>
        {member.relation ? <span className="shrink-0 text-[11.5px] text-soft">{member.relation}</span> : null}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TRUST_DOMAINS.map((k) => {
          const on = domains.includes(k);
          return (
            <button
              key={k}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(k)}
              className={`inline-flex items-center rounded-full border-[1.5px] px-2.5 py-[5px] text-[12px] font-semibold transition-colors ${
                on ? "border-ink bg-ink text-paper" : "border-line bg-paper-2 text-ink hover:border-ink"
              }`}
            >
              {t(`domains.${k}`)}
            </button>
          );
        })}
      </div>
      {toast.node}
    </div>
  );
}
