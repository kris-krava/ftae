'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useTransition } from 'react';
// browser-image-compression is dynamically imported on first compress call
// (see onPhotosChange) so its ~50KB doesn't ship with every page.
import * as Sentry from '@sentry/nextjs';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { XClose, CheckCircle, XCircle, Upload01 } from '@/components/icons';
import { SortablePhoto, PHOTO_TILE_BASIS as TILE_BASIS } from './SortablePhoto';
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock';
import { useFocusTrap } from '@/lib/use-focus-trap';
import type { ArtworkDetail } from '@/app/_lib/profile';
import type { FocalPoint } from '@/lib/focal-point';

const MAX_PHOTOS = 6;
const ACCEPTED = 'image/jpeg,image/png,image/webp';
const SUCCESS_DISPLAY_MS = 1200;
const MAX_DESCRIPTION = 160;

interface ExistingPhotoEntry {
  kind: 'existing';
  id: string;
  url: string;
  focal: FocalPoint;
}
interface NewPhotoEntry {
  kind: 'new';
  id: string;
  file: File;
  focal: FocalPoint;
}
type PhotoEntry = ExistingPhotoEntry | NewPhotoEntry;

export type ArtFormPhoto =
  | { kind: 'existing'; id: string; focal: FocalPoint }
  | { kind: 'new'; file: File; focal: FocalPoint };

export interface ArtFormPayload {
  title: string;
  year: string;
  medium: string;
  width: string;
  height: string;
  depth: string;
  description: string;
  photos: ArtFormPhoto[];
}

export interface ArtFormResult {
  ok: boolean;
  error?: string;
}

interface ArtFormProps {
  /** Pre-fills fields and seeds existing photos. null = create mode. */
  artwork: ArtworkDetail | null;
  /** Modal title (e.g. "Add Art" / "Edit Art"). */
  headerTitle: string;
  /** Subtitle copy under the header. */
  headerSubtitle?: string;
  /** Submit button label (e.g. "Add Art" / "Save Art"). */
  submitLabel: string;
  /** Submit label while pending (e.g. "Uploading…" / "Saving…"). */
  submittingLabel: string;
  /** Success copy after save (e.g. "Art added" / "Art saved"). */
  successLabel: string;
  /** Called with assembled payload; consumer builds its own FormData and calls server action. */
  onSubmit: (payload: ArtFormPayload) => Promise<ArtFormResult>;
  /** When provided, renders the Delete button + confirm dialog. */
  onDelete?: () => Promise<ArtFormResult>;
  /** Success copy after delete (e.g. "Art deleted"). Required when onDelete is provided. */
  deleteSuccessLabel?: string;
  /** Where to navigate on close in standalone mode. */
  backHref: string;
  /** "overlay" dismisses via router.back() (page behind survives); "standalone" pushes backHref. */
  mode: 'overlay' | 'standalone';
}

function makePhotoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function seedPhotos(artwork: ArtworkDetail | null): PhotoEntry[] {
  if (!artwork) return [];
  return artwork.photos.map<ExistingPhotoEntry>((p) => ({
    kind: 'existing',
    id: p.id,
    url: p.url,
    focal: { x: p.focal_x, y: p.focal_y },
  }));
}

type ResultMode = 'saved' | 'deleted';

export function ArtForm({
  artwork,
  headerTitle,
  headerSubtitle = "One piece you made, and would love another artist to have.",
  submitLabel,
  submittingLabel,
  successLabel,
  onSubmit,
  onDelete,
  deleteSuccessLabel,
  backHref,
  mode,
}: ArtFormProps) {
  const router = useRouter();
  useBodyScrollLock();
  const trapRef = useFocusTrap<HTMLDivElement>();
  const [photos, setPhotos] = useState<PhotoEntry[]>(() => seedPhotos(artwork));

  const [title, setTitle] = useState<string>(artwork?.title ?? '');
  const [year, setYear] = useState<string>(artwork?.year != null ? String(artwork.year) : '');
  const [medium, setMedium] = useState<string>(artwork?.medium ?? '');
  const [width, setWidth] = useState<string>(artwork?.width != null ? String(artwork.width) : '');
  const [height, setHeight] = useState<string>(artwork?.height != null ? String(artwork.height) : '');
  const [depth, setDepth] = useState<string>(artwork?.depth != null ? String(artwork.depth) : '');
  const [description, setDescription] = useState<string>(artwork?.description ?? '');

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultMode | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmTrapRef = useFocusTrap<HTMLDivElement>(confirmOpen);
  const [saving, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(
    () => photos.map((p) => (p.kind === 'existing' ? p.url : URL.createObjectURL(p.file))),
    [photos],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
      const { default: imageCompression } = await import('browser-image-compression');
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
      setPhotos((prev) => [
        ...prev,
        ...compressed.map<NewPhotoEntry>((file) => ({
          kind: 'new',
          id: makePhotoId(),
          file,
          focal: { x: 0.5, y: 0.5 },
        })),
      ]);
    } catch (err) {
      console.error(err);
      Sentry.captureException(err, {
        tags: { area: 'art-form', op: 'photo_compress' },
      });
      setError('Could not process one or more photos.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removePhoto(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  function setFocal(id: string, focal: FocalPoint) {
    setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, focal } : p)));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPhotos((items) => {
      const oldIndex = items.findIndex((p) => p.id === active.id);
      const newIndex = items.findIndex((p) => p.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return items;
      return arrayMove(items, oldIndex, newIndex);
    });
  }

  function buildPayload(): ArtFormPayload {
    return {
      title: title.trim(),
      year: year.trim(),
      medium: medium.trim(),
      width: width.trim(),
      height: height.trim(),
      depth: depth.trim(),
      description,
      photos: photos.map<ArtFormPhoto>((p) =>
        p.kind === 'existing'
          ? { kind: 'existing', id: p.id, focal: p.focal }
          : { kind: 'new', file: p.file, focal: p.focal },
      ),
    };
  }

  function onFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (photos.length === 0) {
      setError('Please add at least one photo.');
      return;
    }
    if (!title.trim()) { setError('Please add a title.'); return; }
    if (!year.trim()) { setError('Please add a year.'); return; }
    if (!medium.trim()) { setError('Please add a medium.'); return; }
    if (!width.trim()) { setError('Please add a width.'); return; }
    if (!height.trim()) { setError('Please add a height.'); return; }

    const payload = buildPayload();
    startSaving(async () => {
      const res = await onSubmit(payload);
      if (!res.ok) {
        setError(res.error ?? 'Something went wrong.');
        return;
      }
      setResult('saved');
      setTimeout(() => {
        // No router.refresh() — the server actions already revalidatePath()
        // /<username> + /app/home, and next.config staleTimes.dynamic=0 means
        // the client Router Cache is stale on navigation. Refresh would force
        // a re-fetch of the CURRENT route — fine for save, but in delete the
        // artwork is gone and the route's getArtworkDetail() returns null, so
        // the @modal slot's intercept calls notFound() which bubbles up to
        // the root not-found page and takes over the viewport. Skipping the
        // refresh avoids that 404 flash AND saves a redundant fetch.
        if (mode === 'overlay') router.back();
        else router.push(backHref);
      }, SUCCESS_DISPLAY_MS);
    });
  }

  function handleDelete() {
    if (!onDelete) return;
    setError(null);
    startDeleting(async () => {
      const res = await onDelete();
      if (!res.ok) {
        setError(res.error ?? 'Could not delete.');
        setConfirmOpen(false);
        return;
      }
      setConfirmOpen(false);
      setResult('deleted');
      setTimeout(() => {
        // No router.refresh() — see the matching note in onFormSubmit. In
        // delete it's especially important: refreshing while the URL is
        // still /app/edit-art/<id> re-mounts the @modal intercept whose
        // getArtworkDetail() now returns null, causing notFound() to bubble
        // to the root not-found page and a full-screen 404 flash before we
        // navigate away.
        if (mode === 'overlay') router.back();
        else router.push(backHref);
      }, SUCCESS_DISPLAY_MS);
    });
  }

  if (result) {
    const label = result === 'saved' ? successLabel : (deleteSuccessLabel ?? 'Done');
    return (
      <div className="fixed inset-0 z-50 bg-black/45 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-[16px] py-[24px]">
          <div
            role="status"
            aria-live="polite"
            className="bg-surface rounded-[16px] shadow-modal flex flex-col items-center text-center px-[32px] py-[32px] gap-[16px]"
          >
            {result === 'saved' ? (
              <CheckCircle
                className="w-[64px] h-[64px] text-accent animate-[ftae-pop_360ms_cubic-bezier(0.34,1.56,0.64,1)_both]"
                strokeWidth={2.5}
                aria-hidden
              />
            ) : (
              <XCircle
                className="w-[64px] h-[64px] text-accent animate-[ftae-pop_360ms_cubic-bezier(0.34,1.56,0.64,1)_both]"
                strokeWidth={2.5}
                aria-hidden
              />
            )}
            <p className="font-sans font-semibold text-[18px] leading-[24px] text-ink">{label}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={trapRef} role="dialog" aria-modal="true" aria-label={headerTitle} className="fixed inset-0 z-50 bg-black/45 overflow-y-auto">
      <div
        className="min-h-full flex items-center justify-center px-[16px] py-[24px]"
        onClick={(e) => {
          if (e.currentTarget === e.target && !saving && !deleting && !confirmOpen) close();
        }}
      >
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
            {headerTitle}
          </h2>
          <p className="font-sans text-[15px] text-ink/70 leading-[1.4] px-[32px] mt-[16px]">
            {headerSubtitle}
          </p>

          <form onSubmit={onFormSubmit} className="p-[32px] flex flex-col">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <div className="flex flex-wrap justify-center gap-[8px]">
                <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
                  {photos.map((p, i) => (
                    <SortablePhoto
                      key={p.id}
                      id={p.id}
                      src={previews[i] ?? ''}
                      index={i}
                      focal={p.focal}
                      onRemove={() => removePhoto(p.id)}
                      onSetFocal={(f) => setFocal(p.id, f)}
                    />
                  ))}
                </SortableContext>
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={openPicker}
                    aria-label={photos.length === 0 ? 'Upload images' : 'Add more photos'}
                    className={`${TILE_BASIS} shrink-0 aspect-square rounded-[8px] bg-canvas/40 border-[1.5px] border-divider flex flex-col items-center justify-center gap-[6px]`}
                  >
                    <Upload01 className="w-[24px] h-[24px] text-accent" strokeWidth={1.25} />
                    <span className="font-sans font-medium text-[12px] leading-[16px] text-muted text-center whitespace-pre-line">
                      {'Upload\nImages'}
                    </span>
                  </button>
                )}
              </div>
            </DndContext>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              className="hidden"
              onChange={onFilesPicked}
            />

            <p className="font-sans text-[12px] text-ink/70 leading-[16px] mt-[12px] text-center">
              Up to 6 photos · JPG or PNG · 5 MB each
            </p>

            <div className="mt-[32px] flex flex-col gap-[16px]">
              <Field label="Title" htmlFor="art-title">
                <input
                  id="art-title"
                  name="title"
                  type="text"
                  required
                  maxLength={160}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Morning on the Altamaha"
                  className={inputClass}
                />
              </Field>
              <div className="flex gap-[8px] w-full">
                <div className="flex flex-col gap-[6px]" style={{ flex: '0 0 calc((100% - 16px) / 3)' }}>
                  <label htmlFor="art-year" className="font-sans font-medium text-[13px] text-muted">
                    Year
                  </label>
                  <input
                    id="art-year"
                    name="year"
                    type="number"
                    inputMode="numeric"
                    required
                    min={1000}
                    max={new Date().getFullYear() + 1}
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="YYYY"
                    className={dimInputClass + ' !text-left'}
                  />
                </div>
                <div className="flex flex-col gap-[6px] flex-1 min-w-0">
                  <label htmlFor="art-medium" className="font-sans font-medium text-[13px] text-muted">
                    Medium
                  </label>
                  <input
                    id="art-medium"
                    name="medium"
                    type="text"
                    required
                    maxLength={160}
                    value={medium}
                    onChange={(e) => setMedium(e.target.value)}
                    placeholder="e.g. Oil on linen"
                    className={inputClass}
                  />
                </div>
              </div>
              <Field label="Dimensions (inches)" htmlFor="art-width">
                <div className="flex w-full gap-[8px]">
                  <input
                    id="art-width"
                    name="width"
                    type="number"
                    inputMode="decimal"
                    required
                    min={0}
                    step="any"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    placeholder="Width"
                    className={dimInputClass}
                  />
                  <input
                    id="art-height"
                    name="height"
                    type="number"
                    inputMode="decimal"
                    required
                    min={0}
                    step="any"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="Height"
                    className={dimInputClass}
                  />
                  <input
                    id="art-depth"
                    name="depth"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={depth}
                    onChange={(e) => setDepth(e.target.value)}
                    placeholder="Depth"
                    className={dimInputClass}
                  />
                </div>
              </Field>
              <div className="flex flex-col gap-[6px] items-start w-full">
                <div className="flex items-baseline justify-between w-full">
                  <label htmlFor="art-description" className="font-sans font-medium text-[13px] text-muted">
                    Description
                  </label>
                  <span className="font-sans text-[12px] text-muted">
                    {description.length} / {MAX_DESCRIPTION}
                  </span>
                </div>
                <input
                  id="art-description"
                  name="description"
                  type="text"
                  maxLength={MAX_DESCRIPTION}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short note about this piece…"
                  className={inputClass}
                />
              </div>

              {onDelete ? (
                <div className="flex gap-[12px]">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    disabled={saving || deleting}
                    className="flex-1 h-[48px] rounded-[8px] bg-surface border border-accent text-accent font-semibold text-[16px] disabled:opacity-60"
                  >
                    Delete Art
                  </button>
                  <button
                    type="submit"
                    disabled={saving || deleting}
                    className="flex-1 h-[48px] rounded-[8px] bg-accent text-surface font-semibold text-[16px] disabled:opacity-60"
                  >
                    {saving ? submittingLabel : submitLabel}
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full h-[48px] rounded-[8px] bg-accent text-surface font-semibold text-[16px] disabled:opacity-60"
                >
                  {saving ? submittingLabel : submitLabel}
                </button>
              )}
              {error && (
                <p role="alert" className="text-accent text-[13px] text-center">
                  {error}
                </p>
              )}
            </div>
          </form>
        </div>
      </div>

      {confirmOpen && onDelete && (
        <div
          ref={confirmTrapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete"
          className="fixed inset-0 z-[60] bg-black/45 flex items-center justify-center px-[32px]"
          onClick={(e) => {
            if (e.currentTarget === e.target && !deleting) setConfirmOpen(false);
          }}
        >
          <div className="bg-surface rounded-[16px] shadow-modal w-full max-w-[326px] flex flex-col items-center text-center p-[32px] gap-[16px]">
            <h3 className="font-sans font-semibold text-[18px] leading-[24px] text-ink">Are you sure?</h3>
            <p className="font-sans text-[14px] leading-[20px] text-muted">This is permanent.</p>
            <div className="flex gap-[12px] w-full">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 h-[48px] rounded-[8px] bg-surface border border-accent text-accent font-semibold text-[16px] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-[48px] rounded-[8px] bg-surface border border-accent text-accent font-semibold text-[16px] disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete art'}
              </button>
            </div>
          </div>
        </div>
      )}
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
    <div className="flex flex-col gap-[6px] items-start w-full">
      <label htmlFor={htmlFor} className="font-sans font-medium text-[13px] text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
