'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Mail01 } from '@/components/icons';
import { requestReauth } from '@/app/_actions/reauth';

interface ReauthFormProps {
  currentEmail: string;
  next: string;
}

export function ReauthForm({ currentEmail, next }: ReauthFormProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    fd.set('next', next);
    start(async () => {
      const result = await requestReauth(fd);
      if (result.ok) setSent(true);
      else setError(result.error);
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center mt-[24px]">
        <Mail01 className="w-[64px] h-[64px] text-accent" />
        <h1 className="mt-[24px] font-serif font-bold text-ink text-[28px] tab:text-[34px] desk:text-[38px] leading-[36px] tab:leading-[44px] desk:leading-[50px]">
          Check your email
        </h1>
        <p className="mt-[14px] font-sans text-muted text-[15px] leading-[24px] max-w-[326px]">
          We sent a confirmation link to{' '}
          <span className="font-semibold text-ink">{currentEmail}</span>. Tap it to
          continue.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col items-center w-full max-w-[326px] mt-[32px]">
      <h1 className="font-serif font-bold text-ink text-[28px] leading-[36px] tab:text-[34px] tab:leading-[44px] desk:text-[38px] desk:leading-[50px] text-center">
        Confirm it’s you
      </h1>
      <p className="mt-[16px] font-sans text-muted text-[15px] leading-[24px] text-center">
        Before continuing, we’ll email a confirmation link to{' '}
        <span className="font-semibold text-ink">{currentEmail}</span>.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="mt-[24px] bg-accent text-surface rounded-[8px] h-[48px] px-[16px] font-sans font-semibold text-[16px] disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send confirmation link'}
      </button>
      <button
        type="button"
        onClick={() => router.back()}
        className="mt-[12px] font-sans font-medium text-muted text-[14px]"
      >
        Cancel
      </button>
      {error && (
        <p role="alert" className="mt-[12px] text-accent text-[13px] text-center">
          {error}
        </p>
      )}
    </form>
  );
}
