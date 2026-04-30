'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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
import { ArcSpinner } from '@/components/ArcSpinner';
import { SortablePhoto, PHOTO_TILE_BASIS as TILE_BASIS, type PhotoTileState } from './SortablePhoto';
import { getArtworkUploadUrls } from '@/app/_actions/artwork-upload';
import { uploadFileToSignedUrl, UploadError } from '@/lib/artwork-upload-client';
import type { ArtworkDetail } from '@/app/_lib/profile';
import type { FocalPoint } from '@/lib/focal-point';

const MAX_PHOTOS = 6;
const ACCEPTED = 'image/jpeg,image/png,image/webp';
const MAX_DESCRIPTION = 160;

// Hard cap on pre-compression file size. browser-image-compression can hang
// or OOM on mobile when several huge inputs run web workers in parallel —
// rejecting up-front is far friendlier than an indefinite spinner. Decimal
// 20 MB to match the user-facing "Under 20 MB" copy.
const MAX_PICK_BYTES = 20_000_000;
// Server enforces 5 MB per file (decimal, matches MAX_ARTWORK_BYTES in
// app/_actions/artwork-upload.ts). If a single compressed file in a batch
// is over the cap, the server rejects the ENTIRE batch — so we mirror the
// exact byte count here to fail one tile rather than all of them.
const MAX_UPLOAD_BYTES = 5_000_000;
// Wall-clock cap per compression. Decoding a 24MP JPEG on a fast Mac is
// well under 5s; the 60s ceiling exists so a stuck worker surfaces as
// "couldn't process" instead of spinning forever.
const COMPRESS_TIMEOUT_MS = 60_000;
// Two simultaneous web workers is the sweet spot — enough that fast files
// don't queue behind one slow file, few enough that mobile memory stays
// well under the iOS 50 MB/tab budget for 6×iPhone photos.
const COMPRESS_CONCURRENCY = 2;

interface ExistingPhotoEntry {
  kind: 'existing';
  id: string;
  url: string;
  focal: FocalPoint;
}

// Per-photo upload state machine. Drives both tile rendering and submit
// gating. `compressing` and `uploading` are non-terminal: the submit button
// stays disabled while any new photo is in those states. `uploaded` carries
// the final Storage path that gets sent to the commit action. `failed`
// keeps the compressed file so retry can re-mint a signed URL and re-PUT;
// when compression itself failed we have no file, and the user must remove
// + re-pick (no retry button shown).
type NewPhotoStatus =
  | { tag: 'compressing' }
  | { tag: 'uploading'; progress: number; abort: AbortController; file: File }
  | { tag: 'uploaded'; path: string }
  | { tag: 'failed'; error: string; file: File | null };

interface NewPhotoEntry {
  kind: 'new';
  id: string;
  /** Object URL of the original picked file, used for tile preview from
   *  the moment of pick. Revoked on remove + on unmount. */
  objectUrl: string;
  focal: FocalPoint;
  status: NewPhotoStatus;
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

export function ArtFormBody({
  artwork,
  submitLabel,
  submittingLabel,
  onCommit,
  onSaved,
  onDeleteClick,
  deleting = false,
  lite = false,
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
  const [saving, startSaving] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Once the first batch's signed URLs are minted, the server returns an
  // artworkId. Subsequent pick batches in the same form session pass it
  // back so the new photos land under the same `userId/artworkId/` prefix
  // and the final commit hits the right artwork row.
  const assignedArtworkIdRef = useRef<string | null>(artwork?.id ?? null);
  // HMAC token returned alongside artworkId on the first mint of a
  // new-artwork session. Subsequent mints present it so the server can
  // skip its DB lookup — the artworks row isn't inserted until commit, so
  // a second mint with the asserted id would otherwise fail. Edit Art
  // doesn't need this (the row already exists in the DB).
  const artworkTokenRef = useRef<string | null>(null);

  // Serializes the very first mint of a session. Without this, two pick
  // batches racing while assignedArtworkIdRef is still null would each send
  // `artworkId: undefined` and the server would create two separate artwork
  // rows — orphaning paths from one of them at commit time.
  const firstMintLockRef = useRef<Promise<void> | null>(null);

  async function withFirstMintLock<T>(fn: () => Promise<T>): Promise<T> {
    if (!assignedArtworkIdRef.current && firstMintLockRef.current) {
      await firstMintLockRef.current;
    }
    const claiming = !assignedArtworkIdRef.current;
    // Initialize as a no-op so TS keeps the type `() => void` rather than
    // narrowing it to `null` after the conditional assignment.
    let release: () => void = () => {};
    if (claiming) {
      firstMintLockRef.current = new Promise<void>((res) => {
        release = res;
      });
    }
    try {
      return await fn();
    } finally {
      if (claiming) {
        firstMintLockRef.current = null;
        release();
      }
    }
  }

  // Track every object URL we mint so we can revoke them all on unmount.
  // Without this, long sessions (especially repeated Edit Art opens) would
  // leak File-backed URLs across navigations.
  const objectUrlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  function trackObjectUrl(file: File): string {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  }

  function untrackObjectUrl(url: string): void {
    if (objectUrlsRef.current.delete(url)) URL.revokeObjectURL(url);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Computed gates ------------------------------------------------------
  // `processing` covers both compression and upload — anything non-terminal.
  // While processing, the submit button is disabled and shows a spinner so
  // there's no way to fire commit before the photos are ready (which would
  // otherwise produce a confusing "Please add at least one photo" error).
  const processing = photos.some(
    (p) => p.kind === 'new' && (p.status.tag === 'compressing' || p.status.tag === 'uploading'),
  );
  const hasFailed = photos.some((p) => p.kind === 'new' && p.status.tag === 'failed');

  function openPicker() {
    fileInputRef.current?.click();
  }

  // Mints signed URLs for a batch of files and starts each upload with its
  // own AbortController. Caller chooses entryIds (so retry can use a single
  // entry); each entry must already be in state before this is called.
  // On mint failure: marks every batch entry as 'failed'.
  // On per-photo upload failure: marks just that entry as 'failed'.
  // On per-photo abort (entry was removed mid-upload): silent no-op.
  async function mintAndUpload(items: Array<{ entryId: string; file: File }>) {
    if (items.length === 0) return;
    const filesMeta = items.map((it) => ({ mime: it.file.type, size: it.file.size }));

    let slotsResp: Awaited<ReturnType<typeof getArtworkUploadUrls>>;
    try {
      slotsResp = await getArtworkUploadUrls({
        files: filesMeta,
        artworkId: assignedArtworkIdRef.current ?? undefined,
        artworkToken: artworkTokenRef.current ?? undefined,
      });
    } catch (err) {
      // Network failure or server-action timeout (Vercel kills the function).
      // Surface to the form-level alert so the user sees something more
      // useful than the per-tile retry icon.
      console.error('[art-form] mint threw', err);
      Sentry.captureException(err, {
        tags: { area: 'art-form', op: 'mint_signed_urls' },
        extra: { batch_size: items.length },
      });
      setError('Could not prepare upload. Check your connection and try again.');
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.kind !== 'new') return p;
          const item = items.find((it) => it.entryId === p.id);
          if (!item) return p;
          return { ...p, status: { tag: 'failed', error: 'Could not prepare upload.', file: item.file } };
        }),
      );
      return;
    }

    if (!slotsResp.ok) {
      const msg = slotsResp.error ?? 'Could not prepare upload.';
      // Server returned a structured error — log it explicitly so we can
      // see the message in dev console, and surface to the form-level
      // alert so the user knows what went wrong (rate limit, file size,
      // bucket misconfig, etc.).
      console.error('[art-form] mint returned error:', msg, { batch_size: items.length });
      Sentry.captureMessage(`mint failed: ${msg}`, {
        level: 'warning',
        tags: { area: 'art-form', op: 'mint_signed_urls' },
        extra: { batch_size: items.length, error: msg },
      });
      setError(msg);
      setPhotos((prev) =>
        prev.map((p) => {
          if (p.kind !== 'new') return p;
          const item = items.find((it) => it.entryId === p.id);
          if (!item) return p;
          return { ...p, status: { tag: 'failed', error: msg, file: item.file } };
        }),
      );
      return;
    }
    assignedArtworkIdRef.current = slotsResp.artworkId;
    artworkTokenRef.current = slotsResp.artworkToken;

    // Map server-returned slots back to our entry ids. Slot.index aligns
    // with the order we sent files, so items[slot.index] is its entry.
    const uploads = slotsResp.uploads.map((slot) => ({
      entryId: items[slot.index].entryId,
      file: items[slot.index].file,
      slot,
      abort: new AbortController(),
    }));

    // Transition entries from compressing → uploading. This must happen in
    // a single setPhotos so React batches; otherwise progress events from
    // fast uploads could race ahead of the transition.
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.kind !== 'new') return p;
        const u = uploads.find((it) => it.entryId === p.id);
        if (!u) return p;
        return {
          ...p,
          status: { tag: 'uploading', progress: 0, abort: u.abort, file: u.file },
        };
      }),
    );

    // Kick all uploads off in parallel. Each is independent; one failure
    // doesn't block the others. Browser/Supabase HTTP/2 multiplexes them
    // efficiently — no need for an explicit concurrency cap at this size
    // (max 6 per batch, max ~5 MB each).
    await Promise.all(
      uploads.map(async (u) => {
        try {
          await uploadFileToSignedUrl(u.file, u.slot.signedUrl, u.slot.index, u.file.type, {
            signal: u.abort.signal,
            onProgress: (ev) => {
              setPhotos((prev) =>
                prev.map((p) => {
                  if (p.kind !== 'new' || p.id !== u.entryId) return p;
                  if (p.status.tag !== 'uploading') return p;
                  const progress = ev.total > 0 ? ev.loaded / ev.total : 0;
                  return { ...p, status: { ...p.status, progress } };
                }),
              );
            },
          });
          setPhotos((prev) =>
            prev.map((p) => {
              if (p.kind !== 'new' || p.id !== u.entryId) return p;
              return { ...p, status: { tag: 'uploaded', path: u.slot.path } };
            }),
          );
        } catch (err) {
          // Aborted by removePhoto — entry is already gone from state.
          if (err instanceof UploadError && err.message === 'Upload cancelled') return;
          console.error('[art-form] upload PUT failed', err);
          Sentry.captureException(err, {
            tags: { area: 'art-form', op: 'upload_put' },
            extra: {
              status: err instanceof UploadError ? err.status : null,
              file_bytes: u.file.size,
              file_mime: u.file.type,
            },
          });
          const msg =
            err instanceof UploadError && err.status === 0
              ? 'Network error. Tap retry.'
              : 'Upload failed. Tap retry.';
          setPhotos((prev) =>
            prev.map((p) => {
              if (p.kind !== 'new' || p.id !== u.entryId) return p;
              return { ...p, status: { tag: 'failed', error: msg, file: u.file } };
            }),
          );
        }
      }),
    );
  }

  async function onFilesPicked(event: React.ChangeEvent<HTMLInputElement>) {
    const incoming = Array.from(event.target.files ?? []);
    if (incoming.length === 0) return;
    setError(null);
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    const toProcess = incoming.slice(0, remaining);
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Tile-on-pick: append entries with status='compressing' the moment the
    // user confirms the file dialog so the grid shows tiles + spinners
    // immediately. The submit button is gated by `processing`, so there's no
    // way to fire the misleading "Please add at least one photo" error
    // during this window.
    const newEntries: NewPhotoEntry[] = toProcess.map((file) => ({
      kind: 'new',
      id: makePhotoId(),
      objectUrl: trackObjectUrl(file),
      focal: { x: 0.5, y: 0.5 },
      status: { tag: 'compressing' },
    }));
    setPhotos((prev) => [...prev, ...newEntries]);

    // Compress each file on its own track but with a global cap of
    // COMPRESS_CONCURRENCY simultaneous workers. Two is the sweet spot:
    // enough that fast files don't queue behind a slow file, few enough
    // that mobile memory stays well under the iOS 50 MB/tab budget for
    // 6×iPhone-resolution photos.
    const slots: Array<File | null> = new Array(toProcess.length).fill(null);
    const queue = newEntries.map((entry, i) => ({ slot: i, entryId: entry.id, file: toProcess[i] }));
    const worker = async () => {
      while (queue.length > 0) {
        const job = queue.shift();
        if (!job) return;
        const compressed = await compressOne(job.entryId, job.file);
        if (compressed) slots[job.slot] = compressed;
      }
    };
    await Promise.all(Array.from({ length: COMPRESS_CONCURRENCY }, worker));

    // Build the upload batch from compressions that succeeded AND whose
    // entries are still in the photo list (a user can remove a tile mid-
    // compression). Order matches the user's pick order so drag-reorder
    // and submit-time stitching stay consistent.
    const batch = newEntries
      .map((entry, i) => ({ entryId: entry.id, file: slots[i] }))
      .filter((it): it is { entryId: string; file: File } => it.file !== null);
    if (batch.length === 0) return;

    // ONE mint per pick batch — keeps Supabase Storage from getting hit by
    // 6 simultaneous parallel PUTs and prevents the race where two parallel
    // mints both send `artworkId: undefined` and create two separate
    // artwork rows. The first-mint lock additionally guards against rapid
    // back-to-back picks before the first mint returns.
    await withFirstMintLock(() => mintAndUpload(batch));
  }

  // Compresses a single file end-to-end with size guards and a wall-clock
  // timeout. Updates the entry's status on any failure and returns the
  // compressed File on success (or null on failure). Caller holds the
  // worker slot for the duration so we don't OOM by parallelizing too many
  // simultaneous compressions on a single device.
  async function compressOne(entryId: string, originalFile: File): Promise<File | null> {
    if (originalFile.size > MAX_PICK_BYTES) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.kind === 'new' && p.id === entryId
            ? { ...p, status: { tag: 'failed', error: 'Image too large. Use one under 20 MB.', file: null } }
            : p,
        ),
      );
      return null;
    }

    let imageCompression: typeof import('browser-image-compression').default;
    try {
      imageCompression = (await import('browser-image-compression')).default;
    } catch (err) {
      Sentry.captureException(err, { tags: { area: 'art-form', op: 'compress_load' } });
      setPhotos((prev) =>
        prev.map((p) =>
          p.kind === 'new' && p.id === entryId
            ? { ...p, status: { tag: 'failed', error: 'Could not load processor.', file: null } }
            : p,
        ),
      );
      return null;
    }

    let compressed: File;
    try {
      compressed = await Promise.race([
        imageCompression(originalFile, {
          maxSizeMB: 2,
          maxWidthOrHeight: 2048,
          useWebWorker: true,
          fileType: originalFile.type === 'image/png' ? 'image/png' : 'image/jpeg',
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Compression timed out')), COMPRESS_TIMEOUT_MS),
        ),
      ]);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: 'art-form', op: 'photo_compress' },
        extra: {
          original_bytes: originalFile.size,
          mime: originalFile.type,
          message: err instanceof Error ? err.message : String(err),
        },
      });
      setPhotos((prev) =>
        prev.map((p) =>
          p.kind === 'new' && p.id === entryId
            ? { ...p, status: { tag: 'failed', error: 'Could not process this photo.', file: null } }
            : p,
        ),
      );
      return null;
    }

    if (compressed.size > MAX_UPLOAD_BYTES) {
      Sentry.captureMessage('Compressed photo still over server cap', {
        level: 'warning',
        tags: { area: 'art-form', op: 'photo_compress' },
        extra: { original_bytes: originalFile.size, compressed_bytes: compressed.size },
      });
      setPhotos((prev) =>
        prev.map((p) =>
          p.kind === 'new' && p.id === entryId
            ? {
                ...p,
                status: {
                  tag: 'failed',
                  error: 'Image too detailed to compress. Try a lower-resolution version.',
                  file: null,
                },
              }
            : p,
        ),
      );
      return null;
    }

    return compressed;
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target && target.kind === 'new') {
        // Abort any in-flight upload for this entry.
        if (target.status.tag === 'uploading') {
          target.status.abort.abort();
        }
        // Free the object URL tied to this entry.
        untrackObjectUrl(target.objectUrl);
      }
      return prev.filter((p) => p.id !== id);
    });
  }

  async function retryUpload(id: string) {
    // Snapshot the entry's compressed file (if any) before flipping state.
    let file: File | null = null;
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (!target || target.kind !== 'new' || target.status.tag !== 'failed' || target.status.file === null) {
        return prev;
      }
      file = target.status.file;
      return prev.map((p) =>
        p.id === id && p.kind === 'new'
          ? { ...p, status: { tag: 'compressing' } }
          : p,
      );
    });
    if (!file) return;
    await withFirstMintLock(() => mintAndUpload([{ entryId: id, file: file as File }]));
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
    if (hasFailed) {
      setError('Retry the failed photo before saving.');
      return;
    }
    if (!title.trim()) { setError('Please add a title.'); return; }
    if (!year.trim()) { setError('Please add a year.'); return; }
    if (!medium.trim()) { setError('Please add a medium.'); return; }
    if (!lite) {
      if (!width.trim()) { setError('Please add a width.'); return; }
      if (!height.trim()) { setError('Please add a height.'); return; }
    }

    // By the time we reach here, gating ensures every new photo is in
    // 'uploaded' state and existing photos are unchanged. Build the commit
    // payload from those paths/ids in the user's chosen order.
    const commitArtworkId = assignedArtworkIdRef.current ?? '';
    if (!commitArtworkId) {
      // Pure-existing edit case is impossible (we got here from edit mode
      // with at least one existing photo), so this branch is just a guard.
      setError('Nothing to save.');
      return;
    }

    let payload: ArtFormCommitPayload;
    try {
      payload = {
        artworkId: commitArtworkId,
        title: title.trim(),
        year: year.trim(),
        medium: medium.trim(),
        width: lite ? '' : width.trim(),
        height: lite ? '' : height.trim(),
        depth: lite ? '' : depth.trim(),
        description: lite ? '' : description,
        photos: photos.map<ArtFormCommitPhoto>((p) => {
          if (p.kind === 'existing') return { kind: 'existing', id: p.id, focal: p.focal };
          if (p.status.tag !== 'uploaded') {
            throw new Error('Submit gating let through a non-uploaded photo');
          }
          return { kind: 'new', path: p.status.path, focal: p.focal };
        }),
      };
    } catch (err) {
      Sentry.captureException(err, { tags: { area: 'art-form', op: 'commit_payload_build' } });
      setError('Something went wrong. Try again.');
      return;
    }

    const res = await onCommit(payload);
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.');
      return;
    }
    onSaved?.();
  }

  function onFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (processing || hasFailed) return; // belt-and-suspenders; button is disabled too
    startSaving(executeSave);
  }

  const submitDisabled = saving || deleting || processing || hasFailed;
  const buttonLabel = saving
    ? submittingLabel
    : processing
      ? 'Processing…'
      : submitLabel;

  return (
    <form onSubmit={onFormSubmit} className="flex flex-col">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex flex-wrap justify-center gap-[8px]">
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            {photos.map((p, i) => {
              const src = p.kind === 'existing' ? p.url : p.objectUrl;
              const tileState: PhotoTileState = saving
                ? 'committing'
                : p.kind === 'existing'
                  ? 'ready'
                  : p.status.tag === 'compressing' || p.status.tag === 'uploading'
                    ? 'uploading'
                    : p.status.tag === 'failed'
                      ? 'failed'
                      : 'ready';
              const onRetry =
                p.kind === 'new' && p.status.tag === 'failed' && p.status.file !== null
                  ? () => retryUpload(p.id)
                  : undefined;
              return (
                <SortablePhoto
                  key={p.id}
                  id={p.id}
                  src={src}
                  index={i}
                  focal={p.focal}
                  onRemove={() => removePhoto(p.id)}
                  onSetFocal={(f) => setFocal(p.id, f)}
                  state={tileState}
                  onRetry={onRetry}
                />
              );
            })}
          </SortableContext>
          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={openPicker}
              disabled={saving}
              aria-label={photos.length === 0 ? 'Upload images' : 'Add more photos'}
              className={`${TILE_BASIS} shrink-0 aspect-square rounded-[8px] ${lite ? 'bg-surface' : 'bg-canvas/40'} border-[1.5px] border-divider flex flex-col items-center justify-center gap-[6px] disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <Upload01 className="w-[24px] h-[24px] text-accent" strokeWidth={1.25} />
              <span className="font-sans font-medium text-[12px] leading-[16px] text-muted text-center whitespace-pre-line">
                Upload{'\n'}Images
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
        Up to 6 photos · JPG or PNG · Under 20 MB
      </p>

      {error && (
        <p
          role="alert"
          className="font-sans text-[13px] leading-[18px] text-accent text-center mt-[16px]"
        >
          {error}
        </p>
      )}

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
              disabled={saving || deleting || processing}
              className="flex-1 h-[48px] rounded-[8px] bg-surface border border-accent text-accent font-semibold text-[16px] disabled:opacity-60"
            >
              Delete Art
            </button>
            <button
              type="submit"
              disabled={submitDisabled}
              className="flex-1 h-[48px] rounded-[8px] bg-accent text-surface font-semibold text-[16px] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-[8px]"
            >
              {(saving || processing) && <ArcSpinner size={18} className="text-surface" />}
              <span>{buttonLabel}</span>
            </button>
          </div>
        ) : (
          <button
            type="submit"
            disabled={submitDisabled}
            className="w-full h-[48px] rounded-[8px] bg-accent text-surface font-semibold text-[16px] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-[8px]"
          >
            {(saving || processing) && <ArcSpinner size={18} className="text-surface" />}
            <span>{buttonLabel}</span>
          </button>
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
