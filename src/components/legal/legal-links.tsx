import Link from "next/link";
import { useLocale } from "next-intl";
import { LEGAL, PRIVACY_POLICY_PATH, TERMS_PATH } from "@/content/legal";
import { isLocale, routing } from "@/i18n/routing";

/** « Conditions d’utilisation · Politique de confidentialité », en petit, en bas d'écran. */
export function LegalLinks({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const texts = LEGAL[isLocale(locale) ? locale : routing.defaultLocale];
  return (
    <p className={`text-center text-[11.5px] text-soft ${className}`}>
      <Link href={TERMS_PATH} className="hover:text-ink hover:underline">
        {texts.terms.title}
      </Link>
      <span aria-hidden> · </span>
      <Link href={PRIVACY_POLICY_PATH} className="hover:text-ink hover:underline">
        {texts.privacy.title}
      </Link>
    </p>
  );
}
