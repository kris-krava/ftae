'use client';

import { useTransition } from 'react';
import { signOutAction } from '@/app/_actions/sign-out';

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => signOutAction())}
      className="text-accent disabled:opacity-50"
    >
      {pending ? 'Signing out…' : 'Sign Out'}
    </button>
  );
}
