/** Ne suit que des chemins internes : refuse les URL absolues et les « //evil ». */
export function safeNextPath(value: string | null | undefined, fallback = "/chat"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
