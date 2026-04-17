'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function LandingForm() {
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
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    if (otpError) {
      setPending(false);
      setError('Could not send magic link. Please try again.');
      return;
    }
    router.push(`/check-email?email=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="contents" aria-label="Sign in or sign up">
      <div className="flex flex-col gap-[16px] w-full desk:flex-row desk:gap-[12px] desk:w-[650px] desk:items-center">
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
            'rounded-lg bg-surface border border-field shadow-xs ' +
            'text-ink placeholder:text-placeholder ' +
            'text-[16px] leading-[24px] px-[14px] py-[10px] w-full ' +
            'tab:py-[12px] ' +
            'desk:text-[17px] desk:leading-[26px] desk:px-[16px] desk:py-[14px] desk:flex-1 desk:min-w-0 ' +
            'focus:border-accent focus:outline-none focus:ring-0'
          }
        />
        <button
          type="submit"
          disabled={pending}
          className={
            'shrink-0 rounded-lg bg-accent text-surface shadow-xs ' +
            'font-semibold text-[16px] leading-[24px] ' +
            'px-[20px] py-[12px] w-full ' +
            'tab:py-[14px] ' +
            'desk:text-[17px] desk:leading-[26px] desk:px-[28px] desk:py-[14px] desk:w-auto ' +
            'transition-opacity disabled:opacity-60'
          }
        >
          {pending ? 'Sending…' : 'Join or Sign In'}
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
