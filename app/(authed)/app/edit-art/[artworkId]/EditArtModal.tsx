'use client';

import { ArtForm, type ArtFormPayload } from '@/components/art-form/ArtForm';
import { updateArtwork, softDeleteArtwork } from '@/app/_actions/artwork';
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
  async function handleSubmit(payload: ArtFormPayload) {
    const fd = new FormData();
    fd.set('artworkId', artwork.id);
    fd.set('title', payload.title);
    fd.set('year', payload.year);
    fd.set('medium', payload.medium);
    fd.set('width', payload.width);
    fd.set('height', payload.height);
    if (payload.depth) fd.set('depth', payload.depth);
    fd.set('description', payload.description);

    // photo_order preserves identity across the ordered list. Existing photos
    // carry their DB id; new photos are referenced by their index into
    // new_photos[] so the server can pair file → focal.
    const order: Array<
      | { kind: 'existing'; id: string; focal: [number, number] }
      | { kind: 'new'; new_index: number; focal: [number, number] }
    > = [];
    let newIndex = 0;
    for (const p of payload.photos) {
      if (p.kind === 'existing') {
        order.push({ kind: 'existing', id: p.id, focal: [p.focal.x, p.focal.y] });
      } else {
        order.push({ kind: 'new', new_index: newIndex, focal: [p.focal.x, p.focal.y] });
        fd.append('new_photos', p.file, p.file.name || 'photo.jpg');
        newIndex += 1;
      }
    }
    fd.set('photo_order', JSON.stringify(order));

    const result = await updateArtwork(fd);
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
      onSubmit={handleSubmit}
      onDelete={handleDelete}
      deleteSuccessLabel="Art deleted"
      backHref={backHref}
      mode={mode}
    />
  );
}
