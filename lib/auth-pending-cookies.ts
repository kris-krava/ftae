// Short-lived cookies that carry per-flow context across the magic-link
// round-trip. Because /auth/confirm is a single shared landing page (its URL
// is fixed in the Supabase email template), these cookies are how we tell
// "this confirmation is a deep-link sign-in" from "this is a reauth confirm".

export const PENDING_NEXT_COOKIE = 'ftae_pending_next';
export const PENDING_REAUTH_COOKIE = 'ftae_pending_reauth';

// 1 hour aligns with Supabase's default magic-link token validity.
export const PENDING_COOKIE_MAX_AGE_SECONDS = 60 * 60;
