export type NavKey = "chat" | "memory" | "circle" | "sources" | "privacy" | "edge" | "profile";

export type NavItem = {
  key: NavKey;
  href: `/${string}`;
};
// Libellés : messages/{langue}/nav.json, `tab.{key}` (onglets mobiles) et `side.{key}` (barre latérale).

/**
 * Barre latérale (desktop) et tiroir (mobile ; les onglets du bas de la maquette sont retirés). Structure reprise de Happenstance (2026-11-02) : « Nouvelle question »
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
