'use client';

import { ArtForm, type ArtFormCommitPayload } from '@/components/art-form/ArtForm';
import { commitNewArtwork } from '@/app/_actions/artwork-upload';

interface AddArtModalProps {
  /** Fallback URL used when the modal was opened via direct navigation
   *  (e.g. refresh on /app/add-art) — router history isn't meaningful there. */
  backHref: string;
  /** "overlay" dismisses via router.back() so the underlying page stays put.
   *  "standalone" falls through to a router.push(backHref). */
  mode?: 'overlay' | 'standalone';
}

export function AddArtModal({ backHref, mode = 'standalone' }: AddArtModalProps) {
  async function handleCommit(payload: ArtFormCommitPayload) {
    return commitNewArtwork({
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
      photos: payload.photos.map((p) => {
        if (p.kind === 'existing') {
          // Should be impossible in Add mode (artwork=null seeds zero existing
          // photos), but keep TS happy.
          throw new Error('Unexpected existing photo in add-art commit.');
        }
        return { path: p.path, focal: [p.focal.x, p.focal.y] };
      }),
    });
  }

  return (
    <ArtForm
      artwork={null}
      headerTitle="Add Art"
      submitLabel="Add Art"
      submittingLabel="Saving…"
      successLabel="Art added"
      onCommit={handleCommit}
      backHref={backHref}
      mode={mode}
    />
  );
}
