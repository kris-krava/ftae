'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Mail01 } from '@/components/icons';
import { requestUsernameChange } from '@/app/_actions/edit-username';
import { liveSanitizeUsernameInput } from '@/lib/username-validation';

interface EditUsernameFormProps {
  currentUsername: string;
}

export function EditUsernameForm({ currentUsername }: EditUsernameFormProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sentTo, setSentTo] = useState<{ email: string; username: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState('');

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData();
    fd.set('new_username', value.trim().toLowerCase());
    start(async () => {
      const result = await requestUsernameChange(fd);
      if (result.ok) {
        setSentTo({ email: result.sentTo, username: result.pendingUsername });
      } else if (result.needsReauth) {
        const next = encodeURIComponent('/app/profile/edit-username');
        router.push(`/app/profile/reauthenticate?next=${next}`);
      } else {
        setError(result.error);
      }
    });
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center text-center">
        <Mail01 className="w-[64px] h-[64px] text-accent" strokeWidth={2} />
        <span aria-hidden className="h-[24px] w-px shrink-0" />
        <h1 className="font-serif font-bold text-ink text-[28px] tab:text-[34px] desk:text-[38px] leading-[36px] tab:leading-[44px] desk:leading-[50px]">
          Check your email
        </h1>
        <span aria-hidden className="h-[14px] w-px shrink-0" />
        <p className="font-sans text-muted text-[15px] leading-[24px] max-w-[326px]">
          We sent a confirmation link to{' '}
          <span className="font-semibold text-ink">{sentTo.email}</span>.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col items-center w-[310px]">
      <h1 className="font-serif font-bold text-ink text-[28px] leading-[36px] tab:text-[34px] tab:leading-[44px] desk:text-[38px] desk:leading-[50px] text-center">
        Change your username
      </h1>
      <span aria-hidden className="h-[8px] w-px shrink-0" />
      <p className="font-sans text-muted text-[13px] leading-[20px] text-center">
        You can change your username once every 30 days.
      </p>
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <p className="font-sans font-medium text-muted text-[13px] text-center">Current username</p>
      <span aria-hidden className="h-[4px] w-px shrink-0" />
      <p className="font-sans text-muted/80 text-[15px] text-center">@{currentUsername}</p>
      <span aria-hidden className="h-[24px] w-px shrink-0" />

      <div className="flex flex-col items-start w-full gap-[6px]">
        <label htmlFor="new_username" className="font-sans font-medium text-muted text-[13px]">
          New username
        </label>
        <div className="w-full h-[44px] rounded-[8px] bg-surface border border-field flex items-center px-[14px] focus-within:border-accent transition-colors">
          <span className="font-sans text-[15px] leading-[24px] text-placeholder pr-[2px] select-none">
            @
          </span>
          <input
            id="new_username"
            name="new_username"
            type="text"
            required
            value={value}
            onChange={(e) => setValue(liveSanitizeUsernameInput(e.target.value))}
            placeholder="yourname"
            autoComplete="off"
            spellCheck={false}
            maxLength={30}
            className={
              'flex-1 min-w-0 bg-transparent border-0 outline-none p-0 ' +
              'font-sans text-[15px] leading-[24px] text-ink placeholder:text-placeholder'
            }
          />
        </div>
        <p className="font-sans text-[12px] leading-[16px] text-muted">
          freetradeartexchange.com/{value || 'yourname'}
        </p>
      </div>

      <span aria-hidden className="h-[24px] w-px shrink-0" />

      <div className="flex w-full gap-[12px]">
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
      <p className="font-sans text-muted text-[13px] text-center">
        We&rsquo;ll send a magic link to your email address to confirm the change.
      </p>
      {error && (
        <p role="alert" className="mt-[12px] text-accent text-[13px] text-center">
          {error}
        </p>
      )}
    </form>
  );
}
