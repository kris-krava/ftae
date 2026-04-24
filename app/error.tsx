'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main
      className={
        'flex flex-col items-center justify-center text-center w-full min-h-screen bg-canvas ' +
        'px-[32px] py-[88px] ' +
        'tab:px-[120px] ' +
        'desk:px-[320px]'
      }
    >
      <h1
        className={
          'font-serif font-bold text-ink ' +
          'text-[28px] leading-[36px] ' +
          'tab:text-[34px] tab:leading-[44px] ' +
          'desk:text-[38px] desk:leading-[50px]'
        }
      >
        Something went wrong
      </h1>
      <p
        className={
          'mt-[16px] font-sans text-muted ' +
          'text-[15px] leading-[24px] ' +
          'tab:text-[16px] tab:leading-[26px]'
        }
      >
        We hit an unexpected error. The team has been notified.
      </p>
      <div className="mt-[32px] flex flex-col items-center gap-[16px]">
        <button
          type="button"
          onClick={reset}
          className="bg-accent text-surface rounded-[8px] h-[48px] px-[24px] font-sans font-semibold text-[16px]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="font-sans text-accent underline text-[14px] leading-[22px]"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
