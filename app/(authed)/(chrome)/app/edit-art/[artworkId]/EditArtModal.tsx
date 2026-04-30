'use client';

import { ArtForm, type ArtFormCommitPayload } from '@/components/art-form/ArtForm';
import { commitArtworkUpdate } from '@/app/_actions/artwork-upload';
import { softDeleteArtwork } from '@/app/_actions/artwork';
import { emitArtworkUpdated, emitArtworkDeleted } from '@/lib/artwork-events';
import type { ArtworkDetail } from '@/app/_lib/profile';

interface EditArtModalProps {
  artwork: ArtworkDetail;
  /** Fallback URL used when the modal was opened via direct navigation
   *  (e.g. refresh on /app/edit-art/[id]) — router history isn't meaningful there. */
  backHref: string;
  /** "overlay" dismisses via router.back() so the underlying page stays put.
   *  "standalone" falls through to a router.push(backHref). */
  mode?: 'overlay' | 'standalone';
}

export function EditArtModal({ artwork, backHref, mode = 'standalone' }: EditArtModalProps) {
  async function handleCommit(payload: ArtFormCommitPayload) {
    const result = await commitArtworkUpdate({
      artworkId: payload.artworkId,
      lite: false,
      meta: {
        title: payload.title,
        year: payload.year,
        medium: payload.medium,
        width: payload.width || null,
        height: payload.height || null,
        depth: payload.depth || null,
        description: payload.description || null,
      },
      photos: payload.photos.map((p) =>
        p.kind === 'existing'
          ? { kind: 'existing', id: p.id, focal: [p.focal.x, p.focal.y] }
          : { kind: 'new', path: p.path, focal: [p.focal.x, p.focal.y] },
      ),
    });
    if (result.ok) emitArtworkUpdated(artwork.id);
    return result;
  }

  async function handleDelete() {
    const result = await softDeleteArtwork(artwork.id);
    if (result.ok) emitArtworkDeleted(artwork.id);
    return result;
  }

  return (
    <ArtForm
      artwork={artwork}
      headerTitle="Edit Art"
      submitLabel="Save Art"
      submittingLabel="Saving…"
      successLabel="Art saved"
      onCommit={handleCommit}
      onDelete={handleDelete}
      deleteSuccessLabel="Art deleted"
      backHref={backHref}
      mode={mode}
    />
  );
}
