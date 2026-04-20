'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';
import imageCompression from 'browser-image-compression';
import { XClose, CheckCircle, Upload01 } from '@/components/icons';
import { saveStep4Artwork } from '@/app/_actions/onboarding';

const MAX_PHOTOS = 6;
const ACCEPTED = 'image/jpeg,image/png,image/webp';
const SUCCESS_DISPLAY_MS = 1200;
const MAX_DESCRIPTION = 160;

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
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, start] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => photos.map((p) => URL.createObjectURL(p)), [photos]);

  function close() {
    if (mode === 'overlay') router.back();
    else router.push(backHref);
  }

  function openPicker() {
    fileInputRef.current?.click();
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

  // Build the photo grid rows. Each filled slot shows the image thumbnail with
  // an X remove button. The slot immediately after the last photo is the
  // Upload Images CTA (unless we're already at MAX). Rows of fewer than three
  // tiles are centered by the parent's justify-center.
  const slotCount = photos.length + (photos.length < MAX_PHOTOS ? 1 : 0);
  const rows: { kind: 'photo' | 'cta'; index: number }[][] = [];
  for (let i = 0; i < slotCount; i += 3) {
    const row: { kind: 'photo' | 'cta'; index: number }[] = [];
    for (let k = 0; k < 3 && i + k < slotCount; k += 1) {
      const idx = i + k;
      row.push({ kind: idx < photos.length ? 'photo' : 'cta', index: idx });
    }
    rows.push(row);
  }

  const TILE_BASIS = 'basis-[calc((100%-16px)/3)]';

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
              <XClose className="w-[24px] h-[24px] text-ink" strokeWidth={1.25} />
            </button>

            <h2 className="font-sans font-semibold text-[18px] text-ink pt-[32px] px-[32px]">
              Add Your Art
            </h2>
            <p className="font-sans text-[15px] text-ink/70 leading-[1.4] px-[32px] mt-[8px]">
              This must be an original, singular work of art that you created and would be
              happy to trade with another artist.
            </p>

            <form onSubmit={onSubmit} className="p-[32px] pt-[24px] flex flex-col gap-[16px]">
              <div className="flex flex-col gap-[8px]">
                {rows.map((row, rowIdx) => (
                  <div key={rowIdx} className="flex justify-center gap-[8px]">
                    {row.map((slot) => {
                      if (slot.kind === 'photo') {
                        return (
                          <div
                            key={`photo-${slot.index}`}
                            className={`${TILE_BASIS} relative aspect-square rounded-[8px] overflow-hidden bg-divider`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={previews[slot.index]}
                              alt=""
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(slot.index)}
                              aria-label={`Remove photo ${slot.index + 1}`}
                              className="absolute top-[6px] right-[6px] w-[24px] h-[24px] rounded-full bg-ink/60 flex items-center justify-center"
                            >
                              <XClose className="w-[14px] h-[14px] text-surface" strokeWidth={1.25} />
                            </button>
                          </div>
                        );
                      }
                      return (
                        <button
                          key={`cta-${slot.index}`}
                          type="button"
                          onClick={openPicker}
                          aria-label={photos.length === 0 ? 'Upload images' : 'Add more photos'}
                          className={`${TILE_BASIS} aspect-square rounded-[8px] bg-canvas/40 border-[1.5px] border-divider flex flex-col items-center justify-center gap-[6px]`}
                        >
                          <Upload01 className="w-[24px] h-[24px] text-accent" strokeWidth={1.25} />
                          <span className="font-sans font-medium text-[12px] leading-[16px] text-muted text-center whitespace-pre-line">
                            {'Upload\nImages'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED}
                multiple
                className="hidden"
                onChange={onFilesPicked}
              />

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
              <div className="flex gap-[8px] w-full">
                <div className="flex flex-col gap-[6px]" style={{ flex: '0 0 calc((100% - 16px) / 3)' }}>
                  <label
                    htmlFor="add-year"
                    className="font-sans font-medium text-[13px] text-muted"
                  >
                    Year
                  </label>
                  <input
                    id="add-year"
                    name="year"
                    type="number"
                    inputMode="numeric"
                    required
                    min={1000}
                    max={new Date().getFullYear() + 1}
                    placeholder="YYYY"
                    className={dimInputClass + ' !text-left'}
                  />
                </div>
                <div className="flex flex-col gap-[6px] flex-1 min-w-0">
                  <label
                    htmlFor="add-medium"
                    className="font-sans font-medium text-[13px] text-muted"
                  >
                    Medium
                  </label>
                  <input
                    id="add-medium"
                    name="medium"
                    type="text"
                    required
                    maxLength={160}
                    placeholder="e.g. Oil on linen"
                    className={inputClass}
                  />
                </div>
              </div>
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
                    placeholder="Width"
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
                    placeholder="Height"
                    className={dimInputClass}
                  />
                  <input
                    id="add-depth"
                    name="depth"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="Depth"
                    className={dimInputClass}
                  />
                </div>
              </Field>
              <div className="flex flex-col gap-[6px] items-start w-full">
                <div className="flex items-baseline justify-between w-full">
                  <label
                    htmlFor="add-description"
                    className="font-sans font-medium text-[13px] text-muted"
                  >
                    Description
                  </label>
                  <span className="font-sans text-[12px] text-muted">
                    {description.length} / {MAX_DESCRIPTION}
                  </span>
                </div>
                <input
                  id="add-description"
                  name="description"
                  type="text"
                  maxLength={MAX_DESCRIPTION}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short note about this piece…"
                  className={inputClass}
                />
              </div>

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
  'flex-1 min-w-0 h-[44px] rounded-[8px] bg-surface border border-divider px-[14px] ' +
  'font-sans text-[15px] text-ink text-left placeholder:text-placeholder ' +
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
