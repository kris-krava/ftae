// Session persistence rules differ by device.
// Mobile auto-persists (no checkbox shown). Tablet/desktop opt-in via checkbox.
// The Supabase cookie writers (in middleware + lib/supabase/server.ts) read
// the chosen TTL from `ftae_session_ttl` and override the cookie maxAge.

export const SESSION_TTL_COOKIE = 'ftae_session_ttl';

export const SESSION_TTL_30D_SECONDS = 60 * 60 * 24 * 30;
export const SESSION_TTL_12H_SECONDS = 60 * 60 * 12;

const MOBILE_UA_PATTERN = /Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;

export function isMobileUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  // iPad Safari reports as desktop UA; iPadOS sends Mac UA. Treat tablets as
  // non-mobile for the persistence rule (they get the opt-in checkbox).
  return MOBILE_UA_PATTERN.test(ua);
}

export function resolveSessionTtl(
  userAgent: string | null | undefined,
  rememberParam: string | null | undefined,
): number {
  if (isMobileUserAgent(userAgent)) return SESSION_TTL_30D_SECONDS;
  if (rememberParam === '1') return SESSION_TTL_30D_SECONDS;
  return SESSION_TTL_12H_SECONDS;
}
