/**
 * Solo pre-launch project — no live flag system. Flip a constant and
 * redeploy. Once a decision is permanent, delete the constant and any
 * dead branches.
 */

/** When false, the "Add Art" entry is hidden from both the desktop sidebar
 * and the mobile bottom nav. The /app/add-art route itself still works for
 * direct navigation; only the global-nav affordance is hidden. */
export const SHOW_ADD_ART_NAV = false;
