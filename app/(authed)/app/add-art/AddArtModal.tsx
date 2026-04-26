'use client';

import { ArtForm, type ArtFormPayload } from '@/components/art-form/ArtForm';
import { saveStep4Artwork } from '@/app/_actions/onboarding';

interface AddArtModalProps {
  /** Fallback URL used when the modal was opened via direct navigation
   *  (e.g. refresh on /app/add-art) — router history isn't meaningful there. */
  backHref: string;
  /** "overlay" dismisses via router.back() so the underlying page stays put.
   *  "standalone" falls through to a router.push(backHref). */
  mode?: 'overlay' | 'standalone';
}

export function AddArtModal({ backHref, mode = 'standalone' }: AddArtModalProps) {
  async function handleSubmit(payload: ArtFormPayload) {
    const fd = new FormData();
    fd.set('title', payload.title);
    fd.set('year', payload.year);
    fd.set('medium', payload.medium);
    fd.set('width', payload.width);
    fd.set('height', payload.height);
    if (payload.depth) fd.set('depth', payload.depth);
    fd.set('description', payload.description);
    payload.photos.forEach((p) => {
      if (p.kind === 'new') fd.append('photos', p.file, p.file.name || 'photo.jpg');
    });
    fd.append(
      'photo_focals',
      JSON.stringify(payload.photos.map((p) => [p.focal.x, p.focal.y])),
    );
    return saveStep4Artwork(fd);
  }

  return (
    <ArtForm
      artwork={null}
      headerTitle="Add Art"
      submitLabel="Add Art"
      submittingLabel="Uploading…"
      successLabel="Art added"
      onSubmit={handleSubmit}
      backHref={backHref}
      mode={mode}
    />
  );
}
