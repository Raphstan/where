import type { MetadataRoute } from "next";

/**
 * Appli installable (PWA) : icône sur l'écran d'accueil, ouverture plein écran sans barre de navigateur.
 * Servi à /manifest.webmanifest (exclu du proxy, voir src/proxy.ts).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "WH3RE",
    short_name: "WH3RE",
    description: "Places recommended by the people you trust.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ebe5f2",
    theme_color: "#ebe5f2",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
