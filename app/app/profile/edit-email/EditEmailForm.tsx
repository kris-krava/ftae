'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Mail01 } from '@/components/icons';
import { requestEmailChange } from '@/app/_actions/edit-email';

interface EditEmailFormProps {
  currentEmail: string;
}

export function EditEmailForm({ currentEmail }: EditEmailFormProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    start(async () => {
      const result = await requestEmailChange(fd);
      if (result.ok) {
        setSentEmail(result.pendingEmail);
      } else if (result.needsReauth) {
        const next = encodeURIComponent('/app/profile/edit-email');
        router.push(`/app/profile/reauthenticate?next=${next}`);
      } else {
        setError(result.error);
      }
    });
  }

  if (sentEmail) {
    return (
      <div className="flex flex-col items-center text-center">
        <Mail01 className="w-[64px] h-[64px] text-accent" />
        <span aria-hidden className="h-[24px] w-px shrink-0" />
        <h1 className="font-serif font-bold text-ink text-[28px] tab:text-[34px] desk:text-[38px] leading-[36px] tab:leading-[44px] desk:leading-[50px]">
          Check your new email
        </h1>
        <span aria-hidden className="h-[14px] w-px shrink-0" />
        <p className="font-sans text-muted text-[15px] leading-[24px] max-w-[326px]">
          We sent a verification link to{' '}
          <span className="font-semibold text-ink">{sentEmail}</span>. Tap it to confirm your new email.
        </p>
        <span aria-hidden className="h-[40px] w-px shrink-0" />
        <button
          type="button"
          onClick={() => setSentEmail(null)}
          className="font-sans text-accent text-[13px] underline"
        >
          Wrong address? Go back
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col items-center w-full max-w-[326px]">
      <h1 className="font-serif font-bold text-ink text-[28px] leading-[36px] tab:text-[34px] tab:leading-[44px] desk:text-[38px] desk:leading-[50px] text-center">
        Change your email
      </h1>
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <p className="font-sans font-medium text-ink text-[13px]">Current email</p>
      <span aria-hidden className="h-[4px] w-px shrink-0" />
      <p className="font-sans text-[15px] text-muted/80">{currentEmail}</p>
      <span aria-hidden className="h-[24px] w-px shrink-0" />
      <div className="flex flex-col items-center w-[260px] tab:w-[380px] desk:w-[420px] gap-[8px]">
        <label htmlFor="new_email" className="font-sans font-medium text-ink text-[13px]">
          New email address
        </label>
        <input
          id="new_email"
          name="new_email"
          type="email"
          required
          autoComplete="email"
          placeholder="Enter your new email"
          className={
            'w-full h-[44px] rounded-[8px] bg-surface border border-divider px-[14px] ' +
            'font-sans text-[15px] text-ink text-center placeholder:text-placeholder ' +
            'focus:border-accent focus:outline-none focus:ring-0'
          }
        />
      </div>
      <span aria-hidden className="h-[24px] w-px shrink-0" />
      <button
        type="submit"
        disabled={pending}
        className="bg-accent text-surface rounded-[8px] h-[48px] px-[16px] font-sans font-semibold text-[16px] disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send Verification Link'}
      </button>
      <span aria-hidden className="h-[12px] w-px shrink-0" />
      <button
        type="button"
        onClick={() => router.back()}
        className="font-sans font-medium text-muted text-[14px]"
      >
        Cancel
      </button>
      <span aria-hidden className="h-[16px] w-px shrink-0" />
      <p className="font-sans text-muted text-[13px] text-center max-w-[326px] tab:max-w-[480px] desk:max-w-[640px]">
        We&rsquo;ll send a magic link to your new address to confirm the change.
      </p>
      {error && (
        <p role="alert" className="mt-[12px] text-accent text-[13px] text-center">
          {error}
        </p>
      )}
    </form>
  );
}
