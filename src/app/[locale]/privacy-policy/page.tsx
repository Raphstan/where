import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/legal-page";
import { LEGAL } from "@/content/legal";
import { isLocale, routing } from "@/i18n/routing";

async function textsFor(params: PageProps<"/[locale]/privacy-policy">["params"]) {
  const { locale } = await params;
  return LEGAL[isLocale(locale) ? locale : routing.defaultLocale];
}

export async function generateMetadata(props: PageProps<"/[locale]/privacy-policy">): Promise<Metadata> {
  return { title: (await textsFor(props.params)).privacy.metaTitle };
}

/* Politique de confidentialité (texte : src/content/legal/{langue}.ts). Distincte de /privacy, l'écran de réglages. */
export default async function PrivacyPolicyPage(props: PageProps<"/[locale]/privacy-policy">) {
  const { locale } = await props.params;
  if (isLocale(locale)) setRequestLocale(locale);
  const texts = await textsFor(props.params);
  return <LegalPage doc={texts.privacy} updated={texts.updated} other={{ kind: "terms", label: texts.terms.title }} />;
}
