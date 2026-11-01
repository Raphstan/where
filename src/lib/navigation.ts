export type NavKey = "chat" | "memory" | "circle" | "sources" | "privacy" | "edge" | "profile";

export type NavItem = {
  key: NavKey;
  href: `/${string}`;
  /** Présent dans les onglets mobiles (docs/prototype.html, renderTabs) ; sinon desktop seulement. */
  tab: boolean;
};
// Libellés : messages/{langue}/nav.json, `tab.{key}` (onglets mobiles) et `side.{key}` (barre latérale).

export const NAV_ITEMS: readonly NavItem[] = [
  { key: "chat", href: "/chat", tab: true },
  { key: "memory", href: "/memory", tab: true },
  { key: "circle", href: "/circle", tab: true },
  // Sur mobile, le profil y mène (scrProfile).
  { key: "sources", href: "/sources", tab: false },
  { key: "privacy", href: "/privacy", tab: false },
  { key: "profile", href: "/profile", tab: true },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
