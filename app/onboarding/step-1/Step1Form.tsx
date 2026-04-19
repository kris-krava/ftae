'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import imageCompression from 'browser-image-compression';
import { PlusSquare } from '@/components/icons';
import { finalizeStep1, saveStep1Profile, uploadAvatar } from '@/app/_actions/onboarding';

interface Step1FormProps {
  initialName: string;
  initialLocation: string;
  initialAvatarUrl: string | null;
}

const SAVE_DEBOUNCE_MS = 500;

export function Step1Form({ initialName, initialLocation, initialAvatarUrl }: Step1FormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [location, setLocation] = useState(initialLocation);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [continuePending, startContinue] = useTransition();
  const [, startAutosave] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const fd = new FormData();
      fd.set('name', name);
      fd.set('location_city', location);
      startAutosave(async () => {
        const result = await saveStep1Profile(fd);
        if (!result.ok) setError(result.error);
        else setError(null);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, location]);

  async function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      });
      const fd = new FormData();
      fd.set('avatar', compressed, compressed.name || file.name);
      startAutosave(async () => {
        const result = await uploadAvatar(fd);
        if (!result.ok) setError(result.error);
        else if ('avatarUrl' in result && result.avatarUrl) setAvatarUrl(result.avatarUrl);
      });
    } catch (err) {
      console.error(err);
      setError('Could not process image.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function onContinue() {
    setError(null);
    if (!name.trim()) {
      setError('Please add your display name.');
      return;
    }
    if (!location.trim()) {
      setError('Please add your location.');
      return;
    }
    if (!avatarUrl) {
      setError('Please add a profile photo.');
      return;
    }
    if (!termsAgreed) {
      setError('Please agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }
    startContinue(async () => {
      const result = await finalizeStep1();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push('/onboarding/step-2');
    });
  }

  const continueDisabled = continuePending || !termsAgreed;

  return (
    <>
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Add profile photo"
        className={
          'shrink-0 rounded-full overflow-hidden border-[1.5px] border-field bg-surface/45 ' +
          'flex items-center justify-center ' +
          'w-[193px] h-[193px] ' +
          'desk:w-[240px] desk:h-[240px]'
        }
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={240}
            height={240}
            className="w-full h-full object-cover"
            priority
          />
        ) : (
          <PlusSquare className="w-[48px] h-[48px] text-accent" />
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onAvatarChange}
      />
      <span aria-hidden className="h-[10px] w-px shrink-0" />
      <p className="font-sans text-[12px] leading-[18px] text-muted text-center w-full">
        {avatarUrl ? 'Tap to replace photo' : 'Tap to add photo'}
      </p>
      <span aria-hidden className="h-[16px] w-px shrink-0" />
      <Field label="Display name" htmlFor="name">
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
          autoComplete="name"
          maxLength={80}
          className={inputClass}
        />
      </Field>
      <span aria-hidden className="h-[16px] w-px shrink-0" />
      <Field label="Where are you based?" htmlFor="location" gap={6}>
        <input
          id="location"
          type="text"
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Start typing your city..."
          maxLength={120}
          className={inputClass}
        />
      </Field>
      <span aria-hidden className="h-[24px] w-px shrink-0" />
      <label className="flex items-start gap-[10px] w-full cursor-pointer select-none">
        <input
          type="checkbox"
          required
          checked={termsAgreed}
          onChange={(e) => setTermsAgreed(e.target.checked)}
          className={
            'mt-[1px] shrink-0 w-[20px] h-[20px] rounded-[4px] border-[1.5px] border-field ' +
            'bg-surface accent-accent ' +
            'focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-0'
          }
        />
        <span className="font-sans text-[13px] leading-[20px] text-muted">
          I agree to the{' '}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline hover:opacity-80"
          >
            Terms of Service
          </Link>{' '}
          and the{' '}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline hover:opacity-80"
          >
            Privacy Policy
          </Link>
        </span>
      </label>
      <span aria-hidden className="h-[24px] w-px shrink-0" />
      <button
        type="button"
        onClick={onContinue}
        disabled={continueDisabled}
        className={
          'flex items-center justify-center w-full h-[48px] rounded-[8px] bg-accent text-surface ' +
          'font-semibold text-[16px] leading-[24px] transition-opacity ' +
          'disabled:opacity-40 disabled:cursor-not-allowed'
        }
      >
        {continuePending ? 'Saving…' : 'Continue'}
      </button>
      {error && (
        <p role="alert" className="mt-[8px] text-accent text-[13px] text-center">
          {error}
        </p>
      )}
    </>
  );
}

const inputClass =
  'w-full h-[44px] rounded-[8px] bg-surface border border-field px-[14px] ' +
  'font-sans text-[15px] leading-[24px] text-ink placeholder:text-placeholder ' +
  'focus:border-accent focus:outline-none focus:ring-0';

function Field({
  label,
  htmlFor,
  gap = 6,
  children,
}: {
  label: string;
  htmlFor: string;
  gap?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start w-full" style={{ gap: `${gap}px` }}>
      <label htmlFor={htmlFor} className="font-sans font-medium text-[13px] leading-[18px] text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
