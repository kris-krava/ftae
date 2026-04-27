'use client';

import { useTransition } from 'react';
import { signOutAction } from '@/app/_actions/sign-out';
import { FOLLOW_CTA_DISMISSED_KEY, REFERRAL_CTA_DISMISSED_KEY } from '@/lib/referral';

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(REFERRAL_CTA_DISMISSED_KEY);
            window.localStorage.removeItem(FOLLOW_CTA_DISMISSED_KEY);
          }
          await signOutAction();
        })
      }
      className="text-accent disabled:opacity-50"
    >
      {pending ? 'Signing out…' : 'Sign Out'}
    </button>
  );
}
