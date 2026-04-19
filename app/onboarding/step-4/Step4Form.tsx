'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';
import imageCompression from 'browser-image-compression';
import { saveStep4Artwork } from '@/app/_actions/onboarding';

const MAX_PHOTOS = 8;
const ACCEPTED = 'image/jpeg,image/png,image/webp';

export function Step4Form() {
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => photos.map((p) => URL.createObjectURL(p)), [photos]);

  async function onFilesPicked(event: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    if (incoming.length === 0) return;
    setError(null);

    const remainingSlots = MAX_PHOTOS - photos.length;
    const toProcess = incoming.slice(0, remainingSlots);
    if (incoming.length > remainingSlots) {
      setError(`Up to ${MAX_PHOTOS} photos.`);
    }

    try {
      // ===== TEMP TIMING (remove after debug) =====
      console.log('[step4-client] starting compression for', toProcess.length, 'file(s)');
      toProcess.forEach((f, i) =>
        console.log(`[step4-client] file[${i}] type=${f.type} size=${(f.size / 1024).toFixed(0)}KB name=${f.name}`),
      );
      const tCompressStart = performance.now();
      const compressed = await Promise.all(
        toProcess.map(async (file, i) => {
          const tFileStart = performance.now();
          const out = await imageCompression(file, {
            maxSizeMB: 2,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
            fileType: file.type === 'image/png' ? 'image/png' : 'image/jpeg',
          });
          console.log(
            `[step4-client] file[${i}] compress took ${(performance.now() - tFileStart).toFixed(0)}ms, ` +
            `${(file.size / 1024).toFixed(0)}KB → ${(out.size / 1024).toFixed(0)}KB`,
          );
          return out;
        }),
      );
      console.log(`[step4-client] total compression: ${(performance.now() - tCompressStart).toFixed(0)}ms`);
      // =============================================
      setPhotos((prev) => [...prev, ...compressed]);
    } catch (err) {
      console.error(err);
      setError('Could not process one or more photos.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (photos.length === 0) {
      setError('Please add at least one photo.');
      return;
    }
    const fd = new FormData(event.currentTarget);
    const title = String(fd.get('title') ?? '').trim();
    const year = String(fd.get('year') ?? '').trim();
    const medium = String(fd.get('medium') ?? '').trim();
    const dimensions = String(fd.get('dimensions') ?? '').trim();
    if (!title) { setError('Please add a title.'); return; }
    if (!year) { setError('Please add a year.'); return; }
    if (!medium) { setError('Please add a medium.'); return; }
    if (!dimensions) { setError('Please add dimensions.'); return; }
    photos.forEach((p) => fd.append('photos', p, p.name || 'photo.jpg'));
    // ===== TEMP TIMING (remove after debug) =====
    const totalBytes = photos.reduce((sum, p) => sum + p.size, 0);
    console.log(
      `[step4-client] submitting ${photos.length} photo(s), total ${(totalBytes / 1024).toFixed(0)}KB`,
    );
    const tSubmitStart = performance.now();
    // =============================================
    startTransition(async () => {
      const result = await saveStep4Artwork(fd);
      // ===== TEMP TIMING =====
      console.log(`[step4-client] server action round-trip: ${(performance.now() - tSubmitStart).toFixed(0)}ms`);
      // =======================
      if (!result.ok) setError(result.error);
      else router.push('/onboarding/success');
    });
  }

  return (
    <form onSubmit={onSubmit} className="contents">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        aria-label={photos.length > 0 ? 'Add more photos' : 'Add photos'}
        className={
          'flex flex-col items-center justify-center rounded-[12px] ' +
          'bg-surface/50 border-[1.5px] border-field ' +
          'w-[240px] h-[120px] self-center'
        }
      >
        <CameraIcon className="text-ink" />
        <span aria-hidden className="h-[10px] w-px shrink-0" />
        <span className="font-sans font-semibold text-[15px] leading-[22px] text-ink">
          {photos.length > 0 ? `${photos.length} photo${photos.length === 1 ? '' : 's'} added` : 'Add photos'}
        </span>
        <span aria-hidden className="h-[6px] w-px shrink-0" />
        <span className="font-sans text-[13px] leading-[20px] text-muted">
          Front, back, and detailed shots
        </span>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={onFilesPicked}
      />
      {photos.length > 0 && (
        <div className="grid grid-cols-4 gap-[8px] w-full mt-[16px]">
          {previews.map((src, i) => (
            <div key={src} className="relative aspect-square rounded-[8px] overflow-hidden bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-[4px] right-[4px] w-[20px] h-[20px] rounded-full bg-ink/60 text-surface text-[12px] flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      <span aria-hidden className="h-[24px] w-px shrink-0" />
      <FormField label="Title" htmlFor="title">
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={160}
          placeholder="e.g. Morning on the Altamaha"
          className={inputClass}
        />
      </FormField>
      <span aria-hidden className="h-[16px] w-px shrink-0" />
      <FormField label="Year" htmlFor="year">
        <input
          id="year"
          name="year"
          type="number"
          inputMode="numeric"
          required
          min={1000}
          max={new Date().getFullYear() + 1}
          placeholder="e.g. 2023"
          className={inputClass}
        />
      </FormField>
      <span aria-hidden className="h-[16px] w-px shrink-0" />
      <FormField label="Medium" htmlFor="medium">
        <input
          id="medium"
          name="medium"
          type="text"
          required
          maxLength={160}
          placeholder="e.g. Oil on linen"
          className={inputClass}
        />
      </FormField>
      <span aria-hidden className="h-[16px] w-px shrink-0" />
      <FormField label="Dimensions" htmlFor="dimensions">
        <input
          id="dimensions"
          name="dimensions"
          type="text"
          required
          maxLength={60}
          placeholder="e.g. 24 × 36 in"
          className={inputClass}
        />
      </FormField>
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <button
        type="submit"
        disabled={isPending}
        className="flex items-center justify-center w-full h-[48px] rounded-[8px] bg-accent text-surface font-semibold text-[16px] leading-[24px] disabled:opacity-60"
      >
        {isPending ? 'Uploading…' : 'Complete My Profile'}
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

function FormField({
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
      <label htmlFor={htmlFor} className="font-sans font-medium text-[13px] leading-[18px] text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg
      width="40"
      height="32"
      viewBox="0 0 40 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect x="2" y="6" width="36" height="22" rx="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="20" cy="17" r="6" stroke="currentColor" strokeWidth="2" />
      <path d="M14 6l3-4h6l3 4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
