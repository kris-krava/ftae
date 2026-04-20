'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';
import imageCompression from 'browser-image-compression';
import { XClose, PlusSquare, CheckCircle } from '@/components/icons';
import { saveStep4Artwork } from '@/app/_actions/onboarding';

const MAX_PHOTOS = 8;
const ACCEPTED = 'image/jpeg,image/png,image/webp';
const SUCCESS_DISPLAY_MS = 1200;

interface AddArtModalProps {
  /** Fallback URL used when the modal was opened via direct navigation
   *  (e.g. refresh on /app/add-art) — router history isn't meaningful there. */
  backHref: string;
  /** "overlay" dismisses via router.back() so the underlying page stays put.
   *  "standalone" falls through to a router.push(backHref). */
  mode?: 'overlay' | 'standalone';
}

export function AddArtModal({ backHref, mode = 'standalone' }: AddArtModalProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, start] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => photos.map((p) => URL.createObjectURL(p)), [photos]);

  function close() {
    if (mode === 'overlay') router.back();
    else router.push(backHref);
  }

  async function onFilesPicked(event: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    if (incoming.length === 0) return;
    setError(null);
    const remaining = MAX_PHOTOS - photos.length;
    const toProcess = incoming.slice(0, remaining);
    if (incoming.length > remaining) setError(`Up to ${MAX_PHOTOS} photos.`);

    try {
      const compressed = await Promise.all(
        toProcess.map((f) =>
          imageCompression(f, {
            maxSizeMB: 2,
            maxWidthOrHeight: 2048,
            useWebWorker: true,
            fileType: f.type === 'image/png' ? 'image/png' : 'image/jpeg',
          }),
        ),
      );
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
    const width = String(fd.get('width') ?? '').trim();
    const height = String(fd.get('height') ?? '').trim();
    if (!title) { setError('Please add a title.'); return; }
    if (!year) { setError('Please add a year.'); return; }
    if (!medium) { setError('Please add a medium.'); return; }
    if (!width) { setError('Please add a width.'); return; }
    if (!height) { setError('Please add a height.'); return; }
    photos.forEach((p) => fd.append('photos', p, p.name || 'photo.jpg'));
    start(async () => {
      const result = await saveStep4Artwork(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        router.refresh();
        if (mode === 'overlay') router.back();
        else router.push(backHref);
      }, SUCCESS_DISPLAY_MS);
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/45 overflow-y-auto">
      <div className="min-h-full flex items-center justify-center px-[16px] py-[29px] tab:py-[60px] desk:py-[67px]">
        {success ? (
          <div
            role="status"
            aria-live="polite"
            className="bg-surface rounded-[16px] shadow-modal flex flex-col items-center text-center px-[32px] py-[32px] gap-[16px]"
          >
            <CheckCircle
              className="w-[64px] h-[64px] text-accent animate-[ftae-pop_360ms_cubic-bezier(0.34,1.56,0.64,1)_both]"
              aria-hidden
            />
            <p className="font-sans font-semibold text-[18px] leading-[24px] text-ink">Artwork added</p>
          </div>
        ) : (
          <div className="bg-surface rounded-[16px] shadow-modal w-full max-w-[358px] tab:max-w-[440px] desk:max-w-[580px] relative">
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="absolute top-[32px] right-[32px] flex items-center justify-center w-[24px] h-[24px] z-10"
        >
          <XClose className="w-[24px] h-[24px] text-ink" />
        </button>

        <h2 className="font-sans font-semibold text-[18px] text-ink pt-[32px] px-[32px]">
          Add Your Art
        </h2>
        <p className="font-sans text-[15px] text-ink/70 leading-[1.4] px-[32px] mt-[8px]">
          This must be an original, singular work of art that you created and would be
          happy to trade with another artist.
        </p>

        <form onSubmit={onSubmit} className="p-[32px] pt-[24px] flex flex-col gap-[16px]">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={photos.length > 0 ? 'Add more photos' : 'Add photos'}
            className={
              'rounded-[12px] bg-canvas/60 border-[1.5px] border-divider/70 ' +
              'w-[240px] h-[120px] self-center flex flex-col items-center justify-center'
            }
          >
            <PlusSquare className="w-[48px] h-[48px] text-accent" />
            <span className="font-sans font-semibold text-[15px] text-ink mt-[12px]">
              {photos.length > 0 ? `${photos.length} photo${photos.length === 1 ? '' : 's'} added` : 'Add photos'}
            </span>
            <span className="font-sans text-[13px] text-muted mt-[6px]">
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
            <div className="grid grid-cols-4 gap-[8px]">
              {previews.map((src, i) => (
                <div key={src} className="relative aspect-square rounded-[8px] overflow-hidden bg-divider">
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

          <Field label="Title" htmlFor="add-title">
            <input
              id="add-title"
              name="title"
              type="text"
              required
              maxLength={160}
              placeholder="e.g. Morning on the Altamaha"
              className={inputClass}
            />
          </Field>
          <Field label="Year" htmlFor="add-year">
            <input
              id="add-year"
              name="year"
              type="number"
              inputMode="numeric"
              required
              min={1000}
              max={new Date().getFullYear() + 1}
              placeholder="e.g. 2023"
              className={inputClass}
            />
          </Field>
          <Field label="Medium" htmlFor="add-medium">
            <input
              id="add-medium"
              name="medium"
              type="text"
              required
              maxLength={160}
              placeholder="e.g. Oil on linen"
              className={inputClass}
            />
          </Field>
          <Field label="Dimensions (inches)" htmlFor="add-width">
            <div className="flex w-full gap-[8px]">
              <input
                id="add-width"
                name="width"
                type="number"
                inputMode="decimal"
                required
                min={0}
                step="any"
                placeholder="W"
                className={dimInputClass}
              />
              <input
                id="add-height"
                name="height"
                type="number"
                inputMode="decimal"
                required
                min={0}
                step="any"
                placeholder="H"
                className={dimInputClass}
              />
              <input
                id="add-depth"
                name="depth"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder="D"
                className={dimInputClass}
              />
            </div>
          </Field>

          <button
            type="submit"
            disabled={pending}
            className="w-full h-[48px] rounded-[8px] bg-accent text-surface font-semibold text-[16px] mt-[8px] disabled:opacity-60"
          >
            {pending ? 'Uploading…' : 'Add Artwork'}
          </button>
          {error && (
            <p role="alert" className="text-accent text-[13px] text-center">
              {error}
            </p>
          )}
        </form>
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass =
  'w-full h-[44px] rounded-[8px] bg-surface border border-divider px-[14px] ' +
  'font-sans text-[15px] text-ink placeholder:text-placeholder ' +
  'focus:border-accent focus:outline-none focus:ring-0';

const dimInputClass =
  'flex-1 min-w-0 h-[44px] rounded-[8px] bg-surface border border-divider px-[10px] ' +
  'font-sans text-[15px] text-ink text-center placeholder:text-placeholder ' +
  'focus:border-accent focus:outline-none focus:ring-0 ' +
  '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px] items-start w-full">
      <label htmlFor={htmlFor} className="font-sans font-medium text-[13px] text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
