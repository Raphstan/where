import { timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron appelle la route avec « Authorization: Bearer $CRON_SECRET ». Sans secret configuré,
 * la route refuse tout : elle ne doit jamais être ouverte au public.
 */
export function isCronAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
