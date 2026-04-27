'use client';

import { useEffect } from 'react';
import { consumeFreshSigninFlag } from '@/lib/referral';

/**
 * Mounted once at the (authed) layout level. If the `ftae_fresh_signin` cookie
 * is present, clears the floating-CTA dismiss flags. Covers the case where a
 * user lands on an authed page without a CTA orchestrator (e.g. /app/profile)
 * before navigating to /app/discover or /app/home — without this the cookie
 * would expire un-consumed and stale dismiss flags would persist.
 *
 * The CTA orchestrators (DiscoverClient, HomeFeedClient) also call the helper
 * inline before reading localStorage so the same-mount race is handled.
 */
export function FreshSigninConsumer() {
  useEffect(() => {
    consumeFreshSigninFlag();
  }, []);
  return null;
}
