export const REFERRAL_COOKIE = 'ftae_ref';
export const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

/** localStorage keys — set when the user dismisses one of the floating CTAs;
 * cleared by the sign-out client handler so a fresh login restores them. */
export const REFERRAL_CTA_DISMISSED_KEY = 'ftae_ref_cta_dismissed';
export const FOLLOW_CTA_DISMISSED_KEY = 'ftae_follow_cta_dismissed';
