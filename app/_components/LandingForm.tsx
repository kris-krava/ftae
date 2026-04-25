'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestMagicLink } from '@/app/_actions/sign-in';

interface LandingFormProps {
  /** Optional same-origin path to land on after auth (deep-link funnel). */
  next?: string | null;
  /**
   * `'center'` (landing) horizontally centers the checkbox row inside the
   * form column; `'start'` (sign-in) left-aligns it with the input/button.
   */
  checkboxAlign?: 'center' | 'start';
}

export function LandingForm({ next = null, checkboxAlign = 'center' }: LandingFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [remember, setRemember] = useState(false);
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
    if (remember) fd.set('remember', '1');
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

        {/* Mobile auto-persists; tablet/desktop opt-in via this checkbox. */}
        <label
          className={
            'hidden tab:flex items-center gap-[12px] cursor-pointer select-none ' +
            (checkboxAlign === 'center' ? 'self-center' : 'self-start')
          }
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={pending}
            className="w-[20px] h-[20px] rounded-[6px] border-[1.5px] border-field text-accent accent-accent focus:ring-0 focus:ring-offset-0"
          />
          <span className="font-sans text-ink text-[14px] leading-[20px]">
            Keep me logged in for 30 days
          </span>
        </label>

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
