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
  const [value, setValue] = useState('');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set('new_email', value.trim());
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
        <Mail01 className="w-[64px] h-[64px] text-accent" strokeWidth={2} />
        <span aria-hidden className="h-[24px] w-px shrink-0" />
        <h1 className="font-serif font-bold text-ink text-[28px] tab:text-[34px] desk:text-[38px] leading-[36px] tab:leading-[44px] desk:leading-[50px]">
          Check your email
        </h1>
        <span aria-hidden className="h-[14px] w-px shrink-0" />
        <p className="font-sans text-muted text-[15px] leading-[24px] max-w-[326px]">
          We sent a verification link to{' '}
          <span className="font-semibold text-ink">{sentEmail}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col items-center w-full max-w-[480px]">
      <h1 className="font-serif font-bold text-ink text-[28px] leading-[36px] tab:text-[34px] tab:leading-[44px] desk:text-[38px] desk:leading-[50px] text-center">
        Change your email
      </h1>
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <p className="font-sans font-medium text-muted text-[13px] text-center">Current email</p>
      <span aria-hidden className="h-[4px] w-px shrink-0" />
      <p className="font-sans text-muted/80 text-[15px] text-center">{currentEmail}</p>
      <span aria-hidden className="h-[24px] w-px shrink-0" />

      <div className="flex flex-col items-start w-[310px] gap-[6px]">
        <label htmlFor="new_email" className="font-sans font-medium text-muted text-[13px]">
          New email address
        </label>
        <input
          id="new_email"
          name="new_email"
          type="email"
          required
          autoComplete="email"
          placeholder="Enter your new email"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={
            'w-full h-[44px] rounded-[8px] bg-surface border border-field px-[14px] ' +
            'font-sans text-[15px] leading-[24px] text-ink placeholder:text-placeholder ' +
            'focus:border-accent focus:outline-none focus:ring-0'
          }
        />
      </div>

      <span aria-hidden className="h-[24px] w-px shrink-0" />

      <div className="flex w-[310px] gap-[12px]">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={pending}
          className="flex-1 h-[48px] rounded-[8px] bg-surface border border-accent text-accent font-sans font-semibold text-[16px] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 h-[48px] rounded-[8px] bg-accent text-surface font-sans font-semibold text-[16px] disabled:opacity-60"
        >
          {pending ? 'Sending…' : 'Save'}
        </button>
      </div>

      <span aria-hidden className="h-[16px] w-px shrink-0" />
      <p className="font-sans text-muted text-[13px] text-center w-full">
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
