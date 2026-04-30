'use client';

import { useRouter } from 'next/navigation';
import { ArtFormBody, type ArtFormCommitPayload, type ArtFormResult } from '@/components/art-form/ArtFormBody';
import { commitNewArtwork } from '@/app/_actions/artwork-upload';

export function Step3Form() {
  const router = useRouter();

  async function handleCommit(payload: ArtFormCommitPayload): Promise<ArtFormResult> {
    const result = await commitNewArtwork({
      artworkId: payload.artworkId,
      lite: true,
      meta: {
        title: payload.title,
        year: payload.year,
        medium: payload.medium,
      },
      photos: payload.photos.map((p) => {
        if (p.kind === 'existing') {
          // ArtFormBody seeds zero existing photos when artwork=null, so this
          // branch is unreachable in onboarding — keeping TS happy.
          throw new Error('Unexpected existing photo in step-3 commit.');
        }
        return { path: p.path, focal: [p.focal.x, p.focal.y] };
      }),
    });
    if (result.ok) router.push('/onboarding/success');
    return result;
  }

  return (
    <div className="w-full">
      <ArtFormBody
        artwork={null}
        submitLabel="Complete Profile"
        submittingLabel="Saving…"
        onCommit={handleCommit}
        lite
      />
    </div>
  );
}
