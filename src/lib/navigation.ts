export type NavKey = "chat" | "memory" | "circle" | "sources" | "privacy" | "edge" | "profile";

export type NavItem = {
  key: NavKey;
  href: `/${string}`;
};
// Libellés : messages/{langue}/nav.json, `tab.{key}` (onglets mobiles) et `side.{key}` (barre latérale).

/** Onglets du bas, mobile (docs/prototype.html, renderTabs). Le profil mène aux connecteurs et à la confidentialité. */
export const TAB_ITEMS: readonly NavItem[] = [
  { key: "chat", href: "/chat" },
  { key: "memory", href: "/memory" },
  { key: "circle", href: "/circle" },
  { key: "profile", href: "/profile" },
] as const;

/**
 * Barre latérale, desktop. Structure reprise de Happenstance (2026-11-02) : « Nouvelle question »
 * (bouton), puis ce qui nourrit le chat, puis les conversations récentes ; le profil est en pied.
 */
export const SIDE_ITEMS: readonly NavItem[] = [
  { key: "sources", href: "/sources" },
  { key: "circle", href: "/circle" },
  { key: "memory", href: "/memory" },
] as const;

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
