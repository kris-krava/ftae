'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestMagicLink } from '@/app/_actions/sign-in';

interface LandingFormProps {
  /** Optional same-origin path to land on after auth (deep-link funnel). */
  next?: string | null;
}

export function LandingForm({ next = null }: LandingFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setPending(true);

    // The server action handles email sending plus per-email/per-IP rate
    // limiting. The browser used to call signInWithOtp directly, which had
    // no throttling and could be used to flood any inbox.
    const fd = new FormData();
    fd.set('email', trimmed);
    if (next) fd.set('next', next);
    const result = await requestMagicLink(fd);
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }

    const checkParams = new URLSearchParams({ email: trimmed });
    if (next) checkParams.set('next', next);
    router.push(`/check-email?${checkParams.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="contents" aria-label="Sign in or sign up">
      <div className="w-[310px] flex flex-col gap-[16px]">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={pending}
          className={
            'w-full rounded-lg bg-surface border border-field shadow-xs ' +
            'text-ink placeholder:text-placeholder ' +
            'text-[16px] leading-[24px] px-[14px] py-[10px] ' +
            'focus:border-accent focus:outline-none focus:ring-0'
          }
        />

        <button
          type="submit"
          disabled={pending}
          className={
            'w-full rounded-lg bg-accent text-surface shadow-xs ' +
            'font-semibold text-[16px] leading-[24px] ' +
            'px-[20px] py-[12px] ' +
            'transition-opacity disabled:opacity-60'
          }
        >
          {pending ? 'Sending…' : 'Create Account or Sign In'}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-accent text-[13px] leading-[20px] text-center">
          {error}
        </p>
      )}
    </form>
  );
}
