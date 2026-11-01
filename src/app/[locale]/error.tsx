"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { STATUS_PRIMARY, StatusHomeLink, StatusPage } from "@/components/shell/status-page";

/** Erreur inattendue dans une page : on rassure, on propose de réessayer. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("common.pages");
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <StatusPage title={t("errorTitle")} lead={t("errorLead")}>
      <button type="button" onClick={reset} className={STATUS_PRIMARY}>
        {t("retry")}
      </button>
      <StatusHomeLink label={t("home")} />
    </StatusPage>
  );
}
