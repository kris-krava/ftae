'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import imageCompression from 'browser-image-compression';
import { PlusSquare } from '@/components/icons';
import {
  checkUsernameAvailability,
  finalizeStep1,
  saveStep1Profile,
  uploadAvatar,
} from '@/app/_actions/onboarding';
import {
  liveSanitizeUsernameInput,
  sanitizeUsernameMirror,
  validateUsername,
} from '@/lib/username-validation';

interface Step1FormProps {
  initialName: string;
  initialLocation: string;
  initialAvatarUrl: string | null;
  initialUsername: string;
}

const SAVE_DEBOUNCE_MS = 500;
const USERNAME_CHECK_DEBOUNCE_MS = 400;

export function Step1Form({
  initialName,
  initialLocation,
  initialAvatarUrl,
  initialUsername,
}: Step1FormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [location, setLocation] = useState(initialLocation);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [username, setUsername] = useState(initialUsername);
  // Auto-mirror display name → username until the user manually edits the
  // username field. Re-enabling is intentional — once they take ownership we
  // never overwrite their choice from the display name again.
  const [mirrorEnabled, setMirrorEnabled] = useState(true);
  const [usernameStatus, setUsernameStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'checking' }
    | { kind: 'available' }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' });
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [continuePending, startContinue] = useTransition();
  const [, startAutosave] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);

  // Auto-mirror: as display name changes (and the user hasn't taken ownership
  // of the username field), regenerate the candidate from the new name.
  useEffect(() => {
    if (!mirrorEnabled) return;
    setUsername(sanitizeUsernameMirror(name));
  }, [name, mirrorEnabled]);

  // Debounced autosave — name + location + username.
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
      // Only autosave the username when it passes format validation — avoids
      // a stream of "invalid" errors as the user types mid-word.
      const trimmed = username.trim().toLowerCase();
      if (trimmed.length > 0) {
        const v = validateUsername(trimmed);
        if (v.ok) fd.set('username', trimmed);
      }
      startAutosave(async () => {
        const result = await saveStep1Profile(fd);
        if (!result.ok) setError(result.error);
        else setError(null);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, location, username]);

  // Live username availability check (debounced).
  useEffect(() => {
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    const trimmed = username.trim().toLowerCase();
    if (trimmed.length === 0) {
      setUsernameStatus({ kind: 'idle' });
      return;
    }
    const v = validateUsername(trimmed);
    if (!v.ok) {
      setUsernameStatus({ kind: 'error', message: v.reason });
      return;
    }
    setUsernameStatus({ kind: 'checking' });
    usernameDebounceRef.current = setTimeout(async () => {
      const r = await checkUsernameAvailability(trimmed);
      if (r.available) setUsernameStatus({ kind: 'available' });
      else setUsernameStatus({ kind: 'error', message: r.error ?? 'Taken' });
    }, USERNAME_CHECK_DEBOUNCE_MS);
    return () => {
      if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    };
  }, [username]);

  function onUsernameInput(event: React.ChangeEvent<HTMLInputElement>) {
    setMirrorEnabled(false);
    setUsername(liveSanitizeUsernameInput(event.target.value));
  }

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
    const usernameTrim = username.trim().toLowerCase();
    if (!usernameTrim) {
      setError('Please choose a username.');
      return;
    }
    const v = validateUsername(usernameTrim);
    if (!v.ok) {
      setError(v.reason);
      return;
    }
    if (usernameStatus.kind === 'error') {
      setError(usernameStatus.message);
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

  const continueDisabled =
    continuePending ||
    !termsAgreed ||
    usernameStatus.kind === 'error' ||
    usernameStatus.kind === 'checking' ||
    !username.trim();

  return (
    <div className="w-full max-w-[310px] flex flex-col items-center">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        aria-label="Add profile photo"
        className={
          'shrink-0 rounded-full overflow-hidden border-[1.5px] border-field bg-surface/45 ' +
          'flex items-center justify-center ' +
          'w-[96px] h-[96px] ' +
          'tab:w-[116px] tab:h-[116px] ' +
          'desk:w-[120px] desk:h-[120px]'
        }
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={120}
            height={120}
            className="w-full h-full object-cover"
            priority
          />
        ) : (
          <PlusSquare className="w-[28px] h-[28px] text-accent" />
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
      <Field label="Username" htmlFor="username">
        <div
          className={
            'w-full h-[44px] rounded-[8px] bg-surface border border-field flex items-center px-[14px] ' +
            'focus-within:border-accent transition-colors'
          }
        >
          <span className="font-sans text-[15px] leading-[24px] text-placeholder pr-[2px] select-none">
            @
          </span>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={onUsernameInput}
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
        <p
          className={
            'font-sans text-[12px] leading-[16px] mt-[2px] ' +
            (usernameStatus.kind === 'error' ? 'text-accent' : 'text-muted')
          }
          role={usernameStatus.kind === 'error' ? 'alert' : undefined}
        >
          {usernameStatus.kind === 'error'
            ? usernameStatus.message
            : `freetradeartexchange.com/${username || 'yourname'}`}
        </p>
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
          I agree to{' '}
          <Link
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline hover:opacity-80"
          >
            Terms of Service
          </Link>{' '}
          and{' '}
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
    </div>
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
