'use client';

import { useRouter } from 'next/navigation';
import { ArtFormBody, type ArtFormPayload } from '@/components/art-form/ArtFormBody';
import { saveStep4Artwork } from '@/app/_actions/onboarding';

/**
 * Onboarding step 3 — first piece of art. Reuses the Add Art / Edit Art form
 * body in lite mode (no dimensions, no description). On success, navigates
 * to the success screen which then redirects into the app.
 */
export function Step3Form() {
  const router = useRouter();

  async function handleSubmit(payload: ArtFormPayload) {
    const fd = new FormData();
    fd.set('title', payload.title);
    fd.set('year', payload.year);
    fd.set('medium', payload.medium);
    // width / height / depth / description intentionally omitted — server schema
    // accepts null for those columns. User fills them in via Edit Art on profile.
    payload.photos.forEach((p) => {
      if (p.kind === 'new') fd.append('photos', p.file, p.file.name || 'photo.jpg');
    });
    fd.append(
      'photo_focals',
      JSON.stringify(payload.photos.map((p) => [p.focal.x, p.focal.y])),
    );
    const result = await saveStep4Artwork(fd);
    if (result.ok) router.push('/onboarding/success');
    return result;
  }

  // Width 294/456/516 mirrors Add Art Modal's interior so the photo cell
  // (143/146/166), Year (92/146/166), and Medium dimensions land identical
  // to the Figma step-3 frames (186:1305 / 186:1334 / 186:1363) and to the
  // Add Art / Edit Art screens — the same form, different chrome.
  return (
    <div className="w-full max-w-[294px] tab:max-w-[456px] desk:max-w-[516px] mx-auto">
      <ArtFormBody
        artwork={null}
        submitLabel="Complete Profile"
        submittingLabel="Completing…"
        onSubmit={handleSubmit}
        lite
        gateSubmit
      />
    </div>
  );
}
