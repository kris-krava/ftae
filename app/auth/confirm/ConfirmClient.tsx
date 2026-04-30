'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Wordmark } from '@/app/_components/Wordmark';
import { confirmAuthAction } from './actions';

interface ConfirmClientProps {
  tokenHash: string;
  type: string;
}

export function ConfirmClient({ tokenHash, type }: ConfirmClientProps) {
  const [remember, setRemember] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData();
    fd.set('token_hash', tokenHash);
    fd.set('type', type);
    if (remember) fd.set('remember', '1');

    const result = await confirmAuthAction(fd);
    if (!result.ok) {
      setPending(false);
      setError(result.error);
      return;
    }
    window.location.href = result.redirectTo;
  }

  return (
    <main
      className={
        'flex flex-col items-center justify-center text-center w-full min-h-dvh bg-canvas ' +
        'px-[32px] tab:px-[120px] desk:px-[320px]'
      }
    >
      <Wordmark variant="full" />

      <p
        className={
          'mt-[32px] font-sans font-semibold text-ink ' +
          'text-[15px] leading-[24px] ' +
          'tab:mt-[36px] tab:text-[16px] tab:leading-[26px] ' +
          'desk:text-[17px] desk:leading-[28px]'
        }
      >
        Welcome back!
      </p>

      <form onSubmit={onSubmit} noValidate className="contents" aria-label="Confirm sign in">
        <div className="mt-[16px] w-[310px] flex flex-col gap-[16px] items-center">
          {/* Mobile auto-persists 30d (no checkbox); tablet/desktop opt in. */}
          <label
            className={
              'hidden tab:flex items-center gap-[12px] cursor-pointer select-none'
            }
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              disabled={pending}
              className={
                'w-[20px] h-[20px] rounded-[6px] border-[1.5px] border-[#d4d4d4] bg-surface ' +
                'text-accent accent-accent focus:ring-0 focus:ring-offset-0'
              }
            />
            <span className="font-sans font-medium text-[#404040] text-[16px] leading-[24px]">
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
            {pending ? 'Signing you in…' : 'Come on in!'}
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="mt-[16px] text-accent text-[13px] leading-[20px] text-center max-w-[326px] tab:max-w-[528px] desk:max-w-[640px]"
          >
            {error}
          </p>
        )}
      </form>

      <Link
        href="mailto:help@freetradeartexchange.com"
        className={
          'mt-[24px] font-sans text-accent underline ' +
          'text-[15px] leading-[26px] ' +
          'tab:text-[16px] ' +
          'desk:text-[17px] desk:leading-[28px]'
        }
      >
        help@freetradeartexchange.com
      </Link>
    </main>
  );
}
