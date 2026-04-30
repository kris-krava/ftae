'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
// browser-image-compression is dynamically imported on first compress call
// (see onFilesPicked) so its ~50KB doesn't ship with every page.
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
import { Upload01 } from '@/components/icons';
import { SortablePhoto, PHOTO_TILE_BASIS as TILE_BASIS } from './SortablePhoto';
import { getArtworkUploadUrls } from '@/app/_actions/artwork-upload';
import { uploadFilesInParallel, UploadError } from '@/lib/artwork-upload-client';
import type { ArtworkDetail } from '@/app/_lib/profile';
import type { FocalPoint } from '@/lib/focal-point';

const MAX_PHOTOS = 6;
const ACCEPTED = 'image/jpeg,image/png,image/webp';
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

export type ArtFormCommitPhoto =
  | { kind: 'existing'; id: string; focal: FocalPoint }
  | { kind: 'new'; path: string; focal: FocalPoint };

export interface ArtFormCommitPayload {
  /** Always present: server-minted UUID for new artworks, or existing id for edits. */
  artworkId: string;
  title: string;
  year: string;
  medium: string;
  width: string;
  height: string;
  depth: string;
  description: string;
  photos: ArtFormCommitPhoto[];
}

export interface ArtFormResult {
  ok: boolean;
  error?: string;
}

interface ArtFormBodyProps {
  /** Pre-fills fields and seeds existing photos. null = create mode. */
  artwork: ArtworkDetail | null;
  /** Submit button label (e.g. "Add Art" / "Save Art" / "Complete Profile"). */
  submitLabel: string;
  /** Submit label while finalizing the metadata commit (e.g. "Saving…"). */
  submittingLabel: string;
  /** Called after all new photos have been uploaded to Storage. The payload
   *  includes the server-assigned artworkId and storage paths instead of File
   *  objects. Consumer dispatches commitNewArtwork or commitArtworkUpdate. */
  onCommit: (payload: ArtFormCommitPayload) => Promise<ArtFormResult>;
  /** Fires after a successful commit, after a brief "Saved" beat. Modal
   *  wrappers use this to dismiss themselves; inline consumers (like the
   *  onboarding step) instead navigate forward in their own onCommit. */
  onSaved?: () => void;
  /** When provided, renders the "Delete Art" button next to submit. Click triggers this callback —
   *  the parent owns the confirmation modal and the actual delete server action. */
  onDeleteClick?: () => void;
  /** Disable form interactions while parent is performing a delete. */
  deleting?: boolean;
  /** When true, hide Dimensions and Description fields and skip their validation. Used by
   *  onboarding step-3 where the simplified form only collects photos+title+year+medium. */
  lite?: boolean;
  /** When true, the submit button is disabled until all required fields are filled. Used by
   *  onboarding step-3 to surface progress; Add Art / Edit Art keep the always-enabled button
   *  with click-time validation messaging so users aren't blocked by an opaque disabled state. */
  gateSubmit?: boolean;
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

type SavePhase =
  | { kind: 'idle' }
  | { kind: 'uploading'; loaded: number; total: number }
  | { kind: 'committing' };

export function ArtFormBody({
  artwork,
  submitLabel,
  submittingLabel,
  onCommit,
  onSaved,
  onDeleteClick,
  deleting = false,
  lite = false,
  gateSubmit = false,
}: ArtFormBodyProps) {
  const [photos, setPhotos] = useState<PhotoEntry[]>(() => seedPhotos(artwork));

  const [title, setTitle] = useState<string>(artwork?.title ?? '');
  const [year, setYear] = useState<string>(artwork?.year != null ? String(artwork.year) : '');
  const [medium, setMedium] = useState<string>(artwork?.medium ?? '');
  const [width, setWidth] = useState<string>(artwork?.width != null ? String(artwork.width) : '');
  const [height, setHeight] = useState<string>(artwork?.height != null ? String(artwork.height) : '');
  const [depth, setDepth] = useState<string>(artwork?.depth != null ? String(artwork.depth) : '');
  const [description, setDescription] = useState<string>(artwork?.description ?? '');

  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<SavePhase>({ kind: 'idle' });
  const [saving, startSaving] = useTransition();
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

  async function executeSave() {
    setError(null);
    if (photos.length === 0) {
      setError('Please add at least one photo.');
      return;
    }
    if (!title.trim()) { setError('Please add a title.'); return; }
    if (!year.trim()) { setError('Please add a year.'); return; }
    if (!medium.trim()) { setError('Please add a medium.'); return; }
    if (!lite) {
      if (!width.trim()) { setError('Please add a width.'); return; }
      if (!height.trim()) { setError('Please add a height.'); return; }
    }

    const newEntries = photos
      .map((p, idx) => ({ entry: p, formIndex: idx }))
      .filter((e): e is { entry: NewPhotoEntry; formIndex: number } => e.entry.kind === 'new');

    let assignedArtworkId = artwork?.id ?? '';
    let pathByFormIndex = new Map<number, string>();

    // Mint signed URLs for the new photos (skip if edit-only with no
    // additions). The server returns an artworkId — for new artworks it's
    // a fresh UUID; for edits we pass our id back and get it echoed.
    if (newEntries.length > 0) {
      const totalBytes = newEntries.reduce((sum, e) => sum + e.entry.file.size, 0);
      setPhase({ kind: 'uploading', loaded: 0, total: totalBytes });

      const filesMeta = newEntries.map((e) => ({
        mime: e.entry.file.type,
        size: e.entry.file.size,
      }));

      const slotsResp = await getArtworkUploadUrls({
        files: filesMeta,
        artworkId: artwork?.id,
      });
      if (!slotsResp.ok) {
        setPhase({ kind: 'idle' });
        setError(slotsResp.error ?? 'Could not prepare upload.');
        return;
      }
      assignedArtworkId = slotsResp.artworkId;

      // The server returns slots in the same order we sent files. Build a
      // {formIndex → path} map so we can stitch paths back into the final
      // photos array (which mixes existing + new).
      const slotProgress = new Map<number, { loaded: number; total: number }>();
      newEntries.forEach((e) => slotProgress.set(e.formIndex, { loaded: 0, total: e.entry.file.size }));

      function recomputeProgress() {
        let loaded = 0;
        for (const v of slotProgress.values()) loaded += v.loaded;
        setPhase({ kind: 'uploading', loaded, total: totalBytes });
      }

      try {
        await uploadFilesInParallel(
          slotsResp.uploads.map((slot) => ({
            file: newEntries[slot.index].entry.file,
            signedUrl: slot.signedUrl,
            index: newEntries[slot.index].formIndex,
            contentType: newEntries[slot.index].entry.file.type,
          })),
          {
            concurrency: 3,
            onProgress: (p) => {
              const cur = slotProgress.get(p.index);
              if (!cur) return;
              cur.loaded = p.loaded;
              cur.total = p.total;
              recomputeProgress();
            },
          },
        );
      } catch (err) {
        Sentry.captureException(err, {
          tags: { area: 'art-form', op: 'upload_put' },
          extra: {
            photo_count: newEntries.length,
            total_bytes: totalBytes,
            status: err instanceof UploadError ? err.status : null,
          },
        });
        setPhase({ kind: 'idle' });
        setError('Upload failed. Check your connection and try again.');
        return;
      }

      slotsResp.uploads.forEach((slot) => {
        const formIndex = newEntries[slot.index].formIndex;
        pathByFormIndex.set(formIndex, slot.path);
      });
    } else if (!assignedArtworkId) {
      // Pure-existing edit case is impossible (we got here from edit mode
      // with at least one existing photo), so this branch is just a guard.
      setError('Nothing to save.');
      return;
    }

    setPhase({ kind: 'committing' });

    const commitPayload: ArtFormCommitPayload = {
      artworkId: assignedArtworkId,
      title: title.trim(),
      year: year.trim(),
      medium: medium.trim(),
      width: lite ? '' : width.trim(),
      height: lite ? '' : height.trim(),
      depth: lite ? '' : depth.trim(),
      description: lite ? '' : description,
      photos: photos.map<ArtFormCommitPhoto>((p, idx) => {
        if (p.kind === 'existing') return { kind: 'existing', id: p.id, focal: p.focal };
        const path = pathByFormIndex.get(idx);
        if (!path) throw new Error('Missing upload path for new photo');
        return { kind: 'new', path, focal: p.focal };
      }),
    };

    const res = await onCommit(commitPayload);
    setPhase({ kind: 'idle' });
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.');
      return;
    }
    // The progress UI on the Save button (Uploading photos… X% → Saving…)
    // is the confirmation; modal-mode wrappers dismiss themselves here, and
    // inline consumers (onboarding) navigate in their own onCommit.
    onSaved?.();
  }

  function onFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startSaving(executeSave);
  }

  const canSubmit =
    photos.length > 0 &&
    title.trim().length > 0 &&
    year.trim().length > 0 &&
    medium.trim().length > 0 &&
    (lite || (width.trim().length > 0 && height.trim().length > 0));

  const buttonLabel = (() => {
    if (!saving) return submitLabel;
    if (phase.kind === 'uploading') {
      const pct = phase.total > 0 ? Math.min(100, Math.floor((phase.loaded / phase.total) * 100)) : 0;
      return `Uploading photos… ${pct}%`;
    }
    return submittingLabel;
  })();

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col">
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
                processing={saving}
              />
            ))}
          </SortableContext>
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={openPicker}
              aria-label={photos.length === 0 ? 'Upload images' : 'Add more photos'}
              className={`${TILE_BASIS} shrink-0 aspect-square rounded-[8px] ${lite ? 'bg-surface' : 'bg-canvas/40'} border-[1.5px] border-divider flex flex-col items-center justify-center gap-[6px]`}
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
        Up to 6 photos · JPG or PNG
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
        {!lite && (
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
        )}
        {!lite && (
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
        )}

        {onDeleteClick ? (
          <div className="flex gap-[12px]">
            <button
              type="button"
              onClick={onDeleteClick}
              disabled={saving || deleting}
              className="flex-1 h-[48px] rounded-[8px] bg-surface border border-accent text-accent font-semibold text-[16px] disabled:opacity-60"
            >
              Delete Art
            </button>
            <button
              type="submit"
              disabled={saving || deleting || (gateSubmit && !canSubmit)}
              className="flex-1 h-[48px] rounded-[8px] bg-accent text-surface font-semibold text-[16px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {buttonLabel}
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={saving || (gateSubmit && !canSubmit)}
            className="w-full h-[48px] rounded-[8px] bg-accent text-surface font-semibold text-[16px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {buttonLabel}
          </button>
        )}
        {error && (
          <p role="alert" className="text-accent text-[13px] text-center">
            {error}
          </p>
        )}
      </div>
    </form>
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
