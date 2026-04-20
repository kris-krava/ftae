'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveStep3Links } from '@/app/_actions/onboarding';

interface Step3FormProps {
  initialWebsite: string;
  initialPlatform: string;
  initialHandle: string;
}

const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'linkedin', label: 'LinkedIn' },
];

export function Step3Form({ initialWebsite, initialPlatform, initialHandle }: Step3FormProps) {
  const router = useRouter();
  const [website, setWebsite] = useState(initialWebsite);
  const [platform, setPlatform] = useState(initialPlatform);
  const [handle, setHandle] = useState(initialHandle);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const fd = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await saveStep3Links(fd);
      if (!result.ok) setError(result.error);
      else router.push('/onboarding/success');
    });
  }

  return (
    <form onSubmit={onSubmit} className="contents">
      <div className="flex flex-col gap-[6px] items-start w-full">
        <label htmlFor="website" className="font-sans font-medium text-[13px] leading-[18px] text-muted">
          Your website
        </label>
        <input
          id="website"
          type="url"
          name="website_url"
          inputMode="url"
          autoComplete="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yoursite.com"
          maxLength={300}
          className={inputClass}
        />
      </div>
      <span aria-hidden className="h-[16px] w-px shrink-0" />
      <div
        className={
          'w-full rounded-[8px] bg-surface border border-field h-[44px] ' +
          'flex items-stretch overflow-hidden'
        }
      >
        <div className="flex items-center gap-[8px] pl-[12px] pr-[8px] w-[128px] shrink-0 relative">
          <select
            id="platform"
            name="social_platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            aria-label="Social platform"
            className={
              'absolute inset-0 opacity-0 w-full h-full cursor-pointer ' +
              'focus:outline-none'
            }
          >
            <option value="">None</option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="font-sans font-medium text-[14px] leading-[20px] text-ink truncate flex-1">
            {PLATFORMS.find((p) => p.value === platform)?.label ?? 'Platform'}
          </span>
          <span aria-hidden className="font-sans text-[14px] leading-[20px] text-muted shrink-0">
            ›
          </span>
        </div>
        <span aria-hidden className="w-px h-full bg-field" />
        <input
          id="handle"
          type="text"
          name="social_handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@yourhandle"
          maxLength={60}
          autoComplete="off"
          className={
            'flex-1 min-w-0 px-[12px] bg-transparent ' +
            'font-sans text-[15px] leading-[24px] text-ink placeholder:text-placeholder ' +
            'focus:outline-none'
          }
        />
      </div>
      <span aria-hidden className="h-[8px] w-px shrink-0" />
      <p className="font-sans text-[13px] leading-[20px] text-muted text-center w-full">
        All optional, share what you have.
      </p>
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <button
        type="submit"
        disabled={isPending}
        className="flex items-center justify-center w-full h-[48px] rounded-[8px] bg-accent text-surface font-semibold text-[16px] leading-[24px] disabled:opacity-60"
      >
        {isPending ? 'Saving…' : 'Continue'}
      </button>
      {error && (
        <p role="alert" className="mt-[8px] text-accent text-[13px] text-center">
          {error}
        </p>
      )}
    </form>
  );
}

const inputClass =
  'w-full h-[44px] rounded-[8px] bg-surface border border-field px-[14px] ' +
  'font-sans text-[15px] leading-[24px] text-ink placeholder:text-placeholder ' +
  'focus:border-accent focus:outline-none focus:ring-0';
