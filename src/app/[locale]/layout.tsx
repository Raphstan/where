import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Mono, Figtree, Rubik } from "next/font/google";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MESSAGES } from "@/i18n/messages";
import { isRtl, routing } from "@/i18n/routing";
import "../globals.css";

/* Polices de la landing (wh3re.com). */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

/* Hébreu : Bricolage et Figtree n'ont pas de glyphes hébreux ; Rubik prend le relais pour ces caractères. */
const rubik = Rubik({
  variable: "--font-rubik",
  subsets: ["hebrew", "latin"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await rootLocale();
  const t = await getTranslations({ locale, namespace: "meta" });
  return {
    title: { default: "WH3RE", template: "%s · WH3RE" },
    description: t("description"),
  };
}

export const viewport: Viewport = {
  themeColor: "#ebe5f2",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  // Paramètre racine (next/root-params) : connu du shell statique, contrairement à `params`.
  const locale = await rootLocale();
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      className={`${bricolage.variable} ${figtree.variable} ${rubik.variable} ${dmMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={MESSAGES[locale]}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
