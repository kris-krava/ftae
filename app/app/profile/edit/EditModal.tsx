'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import imageCompression from 'browser-image-compression';
import { XClose, PlusSquare } from '@/components/icons';
import { PlatformBadge } from '@/components/PlatformBadge';
import { AvatarEditor, AvatarUploading } from '@/components/profile/AvatarEditor';
import {
  saveStep1Profile,
  setAvatarFocal,
  uploadAvatar,
  saveStep2Mediums,
  saveStep2Bio,
  saveStep3Links,
} from '@/app/_actions/onboarding';
import type { FocalPoint } from '@/lib/focal-point';

const SAVE_DEBOUNCE_MS = 500;
const MAX_BIO = 160;
const PLATFORMS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'x', label: 'X' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'pinterest', label: 'Pinterest' },
  { value: 'linkedin', label: 'LinkedIn' },
];

interface EditModalProps {
  backHref: string;
  initial: {
    name: string;
    location: string;
    avatarUrl: string | null;
    avatarFocalX: number;
    avatarFocalY: number;
    mediumIds: string[];
    bio: string;
    website: string;
    socialPlatform: string;
    socialHandle: string;
  };
  mediums: { id: string; name: string }[];
}

export function EditModal({ backHref, initial, mediums }: EditModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);

  function close() {
    router.push(backHref);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/45 overflow-y-auto">
      <div
        className="min-h-full flex items-center justify-center px-[16px] py-[29px] tab:py-[60px] desk:py-[67px]"
        onClick={(e) => {
          if (e.currentTarget === e.target) close();
        }}
      >
      <div
        className={
          'bg-surface rounded-[16px] shadow-modal flex flex-col relative w-full ' +
          'max-w-[358px] tab:max-w-[440px] desk:max-w-[580px] p-[32px]'
        }
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-[32px] right-[32px] flex items-center justify-center w-[24px] h-[24px] z-10"
        >
          <XClose className="w-[24px] h-[24px] text-ink" />
        </button>

        <h2 className="font-sans font-semibold text-[18px] text-ink">
          Edit Profile
        </h2>

        <div className="flex flex-col gap-[8px] items-center w-full mt-[32px]">
          <p className="font-sans font-medium text-[11px] tracking-[1.5px] text-muted text-center">
            STEP {step} OF 3
          </p>
          <div className="flex gap-[6px] h-[3px] w-full">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`flex-1 h-full rounded-[2px] ${i <= step ? 'bg-accent' : 'bg-divider'}`}
              />
            ))}
          </div>
        </div>

        <div className="w-full mt-[32px] flex flex-col items-center">
          {step === 1 && (
            <Step1
              initialName={initial.name}
              initialLocation={initial.location}
              initialAvatarUrl={initial.avatarUrl}
              initialAvatarFocalX={initial.avatarFocalX}
              initialAvatarFocalY={initial.avatarFocalY}
              onContinue={() => setStep(2)}
              onError={setError}
            />
          )}
          {step === 2 && (
            <Step2
              mediums={mediums}
              initialSelectedIds={initial.mediumIds}
              initialBio={initial.bio}
              onContinue={() => setStep(3)}
              onError={setError}
            />
          )}
          {step === 3 && (
            <Step3
              initialWebsite={initial.website}
              initialPlatform={initial.socialPlatform}
              initialHandle={initial.socialHandle}
              onDone={close}
              onError={setError}
            />
          )}
        </div>

        {error && (
          <p role="alert" className="mt-[12px] text-accent text-[13px] text-center">
            {error}
          </p>
        )}
      </div>
      </div>
    </div>
  );
}

function Step1({
  initialName,
  initialLocation,
  initialAvatarUrl,
  initialAvatarFocalX,
  initialAvatarFocalY,
  onContinue,
  onError,
}: {
  initialName: string;
  initialLocation: string;
  initialAvatarUrl: string | null;
  initialAvatarFocalX: number;
  initialAvatarFocalY: number;
  onContinue: () => void;
  onError: (e: string | null) => void;
}) {
  const [name, setName] = useState(initialName);
  const [location, setLocation] = useState(initialLocation);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [focal, setFocal] = useState<FocalPoint>({ x: initialAvatarFocalX, y: initialAvatarFocalY });
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);
  const [, start] = useTransition();

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
      start(async () => {
        const r = await saveStep1Profile(fd);
        if (!r.ok) onError(r.error);
        else onError(null);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name, location, onError]);

  async function onAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    onError(null);
    setIsUploadingAvatar(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
      });
      const bitmap = await createImageBitmap(compressed);
      const aspect = bitmap.height > 0 ? bitmap.width / bitmap.height : 1;
      bitmap.close();
      const fd = new FormData();
      fd.set('avatar', compressed, compressed.name || file.name);
      fd.set('aspect', String(aspect));
      start(async () => {
        try {
          const r = await uploadAvatar(fd);
          if (!r.ok) onError(r.error);
          else if ('avatarUrl' in r && r.avatarUrl) {
            setAvatarUrl(r.avatarUrl);
            setFocal({ x: 0.5, y: 0.5 });
          }
        } finally {
          setIsUploadingAvatar(false);
        }
      });
    } catch {
      onError('Could not process image.');
      setIsUploadingAvatar(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleSetFocal(next: FocalPoint) {
    setFocal(next);
    void setAvatarFocal(next);
  }

  return (
    <>
      {isUploadingAvatar ? (
        <AvatarUploading size={96} />
      ) : avatarUrl ? (
        <AvatarEditor src={avatarUrl} size={96} focal={focal} onSetFocal={handleSetFocal} />
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Add profile photo"
          className="relative w-[96px] h-[96px] rounded-full overflow-hidden bg-divider border-[1.5px] border-field flex items-center justify-center"
        >
          <PlusSquare className="w-[28px] h-[28px] text-accent" />
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onAvatarChange}
      />
      <span className="h-[10px] w-px shrink-0" />
      {avatarUrl ? (
        <>
          <p className="font-sans text-[12px] text-muted text-center w-full">
            Tap inside to choose what stays centered
          </p>
          <span className="h-[6px] w-px shrink-0" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="font-sans text-[12px] text-accent underline"
          >
            Replace photo
          </button>
        </>
      ) : (
        <p className="font-sans text-[12px] text-muted text-center w-full">Tap to add photo</p>
      )}
      <span className="h-[16px] w-px shrink-0" />
      <Field label="Display name" htmlFor="edit-name">
        <input
          id="edit-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          autoComplete="name"
          className={inputClass}
        />
      </Field>
      <span className="h-[16px] w-px shrink-0" />
      <Field label="Where are you based?" htmlFor="edit-location">
        <input
          id="edit-location"
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={120}
          className={inputClass}
        />
      </Field>
      <span className="h-[32px] w-px shrink-0" />
      <button
        type="button"
        onClick={onContinue}
        className="w-full h-[48px] rounded-[8px] bg-accent text-surface font-semibold text-[16px]"
      >
        Continue
      </button>
    </>
  );
}

function Step2({
  mediums,
  initialSelectedIds,
  initialBio,
  onContinue,
  onError,
}: {
  mediums: { id: string; name: string }[];
  initialSelectedIds: string[];
  initialBio: string;
  onContinue: () => void;
  onError: (e: string | null) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelectedIds));
  const [bio, setBio] = useState(initialBio);
  const mediumDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bioDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(false);
  const [, start] = useTransition();

  useEffect(() => {
    if (!mounted.current) return;
    if (mediumDebounce.current) clearTimeout(mediumDebounce.current);
    mediumDebounce.current = setTimeout(() => {
      const ids = Array.from(selected);
      start(async () => {
        const r = await saveStep2Mediums(ids);
        if (!r.ok) onError(r.error);
        else onError(null);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (mediumDebounce.current) clearTimeout(mediumDebounce.current);
    };
  }, [selected, onError]);

  useEffect(() => {
    if (!mounted.current) return;
    if (bioDebounce.current) clearTimeout(bioDebounce.current);
    bioDebounce.current = setTimeout(() => {
      start(async () => {
        const r = await saveStep2Bio(bio);
        if (!r.ok) onError(r.error);
        else onError(null);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (bioDebounce.current) clearTimeout(bioDebounce.current);
    };
  }, [bio, onError]);

  useEffect(() => {
    mounted.current = true;
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <h2 className="font-serif font-bold text-ink text-[24px] text-center w-full">
        What&rsquo;s your medium?
      </h2>
      <span className="h-[24px] w-px shrink-0" />
      <div className="flex flex-wrap items-start gap-[8px] w-full">
        {mediums.map((m) => {
          const on = selected.has(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              aria-pressed={on}
              className={[
                'rounded-full px-[12px] py-[8px] font-sans font-medium text-[14px] border',
                on
                  ? 'bg-accent/10 border-surface text-accent'
                  : 'bg-surface border-field text-muted',
              ].join(' ')}
            >
              {m.name}
            </button>
          );
        })}
      </div>
      <span className="h-[24px] w-px shrink-0" />
      <label htmlFor="edit-bio" className="font-sans font-medium text-[13px] text-muted w-full">
        In one line, who are you as an artist?
      </label>
      <span className="h-[6px] w-px shrink-0" />
      <textarea
        id="edit-bio"
        value={bio}
        onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
        rows={2}
        maxLength={MAX_BIO}
        className={`${inputClass} h-auto py-[10px] resize-none`}
      />
      <span className="h-[6px] w-px shrink-0" />
      <p className="font-sans text-[12px] text-muted text-right w-full">
        {bio.length} / {MAX_BIO}
      </p>
      <span className="h-[24px] w-px shrink-0" />
      <button
        type="button"
        onClick={onContinue}
        className="w-full h-[48px] rounded-[8px] bg-accent text-surface font-semibold text-[16px]"
      >
        Continue
      </button>
    </>
  );
}

function Step3({
  initialWebsite,
  initialPlatform,
  initialHandle,
  onDone,
  onError,
}: {
  initialWebsite: string;
  initialPlatform: string;
  initialHandle: string;
  onDone: () => void;
  onError: (e: string | null) => void;
}) {
  const [website, setWebsite] = useState(initialWebsite);
  const [platform, setPlatform] = useState(initialPlatform);
  const [handle, setHandle] = useState(initialHandle);
  const [pending, start] = useTransition();

  function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError(null);
    const fd = new FormData(event.currentTarget);
    start(async () => {
      const r = await saveStep3Links(fd);
      if (!r.ok) onError(r.error);
      else onDone();
    });
  }

  return (
    <form onSubmit={onSave} className="contents">
      <h2 className="font-serif font-bold text-ink text-[24px] text-center w-full">
        Add your links?
      </h2>
      <span className="h-[24px] w-px shrink-0" />
      <Field label="Your website" htmlFor="edit-website">
        <input
          id="edit-website"
          name="website_url"
          type="url"
          inputMode="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yoursite.com"
          maxLength={300}
          className={inputClass}
        />
      </Field>
      <span className="h-[16px] w-px shrink-0" />
      <div className="w-full rounded-[8px] bg-surface border border-field h-[44px] flex items-stretch overflow-hidden">
        <div className="relative w-[128px] shrink-0 flex items-center gap-[8px] pl-[12px] pr-[8px]">
          <select
            id="edit-platform"
            name="social_platform"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            aria-label="Social platform"
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer focus:outline-none"
          >
            <option value="">None</option>
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {platform && <PlatformBadge platform={platform} />}
          <span className="font-sans font-medium text-[14px] text-ink truncate flex-1">
            {PLATFORMS.find((p) => p.value === platform)?.label ?? 'Platform'}
          </span>
          <span aria-hidden className="font-sans text-[14px] text-muted shrink-0">›</span>
        </div>
        <span aria-hidden className="w-px h-full bg-field" />
        <input
          id="edit-handle"
          name="social_handle"
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="@yourhandle"
          maxLength={60}
          className="flex-1 min-w-0 px-[12px] bg-transparent font-sans text-[15px] text-ink placeholder:text-placeholder focus:outline-none"
        />
      </div>
      <span className="h-[24px] w-px shrink-0" />
      <button
        type="submit"
        disabled={pending}
        className="w-full h-[48px] rounded-[8px] bg-accent text-surface font-semibold text-[16px] disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}

const inputClass =
  'w-full h-[44px] rounded-[8px] bg-surface border border-field px-[14px] ' +
  'font-sans text-[15px] text-ink placeholder:text-placeholder ' +
  'focus:border-accent focus:outline-none focus:ring-0';

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start w-full gap-[6px]">
      <label htmlFor={htmlFor} className="font-sans font-medium text-[13px] text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
