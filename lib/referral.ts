export const REFERRAL_COOKIE = 'ftae_ref';
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** localStorage keys — set when the user dismisses one of the floating CTAs;
 * cleared by the sign-out client handler so a fresh login restores them. */
export const REFERRAL_CTA_DISMISSED_KEY = 'ftae_ref_cta_dismissed';
export const FOLLOW_CTA_DISMISSED_KEY = 'ftae_follow_cta_dismissed';

/** Short-lived cookie set on every successful sign-in (real magic-link via
 * /auth/callback, and dev test-login via /dev/test-login/finish). Chromed
 * client orchestrators consume + delete it on mount and use its presence
 * as the signal that CTA dismiss flags should be cleared — so dismissal
 * resets on the next login regardless of which auth path was used. */
export const FRESH_SIGNIN_COOKIE = 'ftae_fresh_signin';
export const FRESH_SIGNIN_COOKIE_MAX_AGE_SECONDS = 60;

/** Client helper — call once on mount of any chromed orchestrator. If the
 * fresh-signin cookie is present, clears the CTA dismiss flags and deletes
 * the cookie. Idempotent + cheap; safe to call from any 'use client' file. */
export function consumeFreshSigninFlag() {
  if (typeof document === 'undefined') return;
  const present = document.cookie
    .split('; ')
    .some((c) => c.startsWith(`${FRESH_SIGNIN_COOKIE}=`));
  if (!present) return;
  window.localStorage.removeItem(REFERRAL_CTA_DISMISSED_KEY);
  window.localStorage.removeItem(FOLLOW_CTA_DISMISSED_KEY);
  document.cookie = `${FRESH_SIGNIN_COOKIE}=; max-age=0; path=/`;
}
