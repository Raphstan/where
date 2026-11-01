import { useTranslations } from "next-intl";
import Link from "next/link";
import { STATUS_PRIMARY, StatusPage } from "@/components/shell/status-page";

export default function NotFound() {
  const t = useTranslations("common.pages");
  return (
    <StatusPage title={t("notFoundTitle")} lead={t("notFoundLead")}>
      <Link href="/chat" className={STATUS_PRIMARY}>
        {t("home")}
      </Link>
    </StatusPage>
  );
}
