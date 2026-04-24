'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_ARTWORK_BYTES = 5_000_000;
const MAX_ARTWORK_PHOTOS = 6;

export type ArtworkActionResult = { ok: true } | { ok: false; error: string };

const MetaSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(160),
  year: z
    .coerce.number({ invalid_type_error: 'Year is required.' })
    .int()
    .min(1000)
    .max(new Date().getFullYear() + 1),
  medium: z.string().trim().min(1, 'Medium is required.').max(160),
  width: z
    .coerce.number({ invalid_type_error: 'Width is required.' })
    .positive('Width must be greater than 0.')
    .max(10000),
  height: z
    .coerce.number({ invalid_type_error: 'Height is required.' })
    .positive('Height must be greater than 0.')
    .max(10000),
  depth: z.coerce.number().nonnegative().max(10000).optional().nullable(),
  description: z.string().trim().max(160).optional().nullable(),
});

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user.id;
}

function storagePathFromUrl(url: string): string | null {
  const marker = '/artwork-photos/';
  const idx = url.indexOf(marker);
  if (idx < 0) return null;
  return url.slice(idx + marker.length);
}

interface ExistingRef {
  kind: 'existing';
  id: string;
  focal: [number, number];
}
interface NewRef {
  kind: 'new';
  new_index: number;
  focal: [number, number];
}
type PhotoRef = ExistingRef | NewRef;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

export async function updateArtwork(formData: FormData): Promise<ArtworkActionResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  const rl = await rateLimit(`art:update:${userId}`, 20, 60_000);
  if (!rl.ok) return { ok: false, error: 'Too many updates.' };

  const artworkId = String(formData.get('artworkId') ?? '').trim();
  if (!artworkId) return { ok: false, error: 'Missing artwork id.' };

  const { data: art, error: artErr } = await supabaseAdmin
    .from('artworks')
    .select('id, user_id, is_active')
    .eq('id', artworkId)
    .maybeSingle();
  if (artErr || !art) return { ok: false, error: 'Artwork not found.' };
  if (art.user_id !== userId) return { ok: false, error: 'Not authorized.' };
  if (!art.is_active) return { ok: false, error: 'Artwork is deleted.' };

  const depthRaw = formData.get('depth');
  const descRaw = formData.get('description');
  const meta = MetaSchema.safeParse({
    title: formData.get('title'),
    year: formData.get('year') || undefined,
    medium: formData.get('medium'),
    width: formData.get('width') || undefined,
    height: formData.get('height') || undefined,
    depth: depthRaw !== null && String(depthRaw).trim() !== '' ? depthRaw : undefined,
    description: typeof descRaw === 'string' ? descRaw : null,
  });
  if (!meta.success) {
    return { ok: false, error: meta.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const orderRaw = formData.get('photo_order');
  if (typeof orderRaw !== 'string') return { ok: false, error: 'Missing photo order.' };
  const order: PhotoRef[] = [];
  try {
    const parsed = JSON.parse(orderRaw);
    if (!Array.isArray(parsed)) throw new Error('not array');
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const focalArr = Array.isArray(entry.focal) && entry.focal.length === 2
        ? ([clamp01(Number(entry.focal[0])), clamp01(Number(entry.focal[1]))] as [number, number])
        : ([0.5, 0.5] as [number, number]);
      if (entry.kind === 'existing' && typeof entry.id === 'string') {
        order.push({ kind: 'existing', id: entry.id, focal: focalArr });
      } else if (entry.kind === 'new' && Number.isInteger(entry.new_index)) {
        order.push({ kind: 'new', new_index: entry.new_index, focal: focalArr });
      }
    }
  } catch {
    return { ok: false, error: 'Invalid photo order.' };
  }
  if (order.length === 0) return { ok: false, error: 'At least one photo is required.' };
  if (order.length > MAX_ARTWORK_PHOTOS) {
    return { ok: false, error: `Up to ${MAX_ARTWORK_PHOTOS} photos.` };
  }

  const files: File[] = [];
  for (const entry of formData.getAll('new_photos')) {
    if (entry instanceof File && entry.size > 0) files.push(entry);
  }
  for (const f of files) {
    if (!ALLOWED_IMAGE_TYPES.has(f.type)) {
      return { ok: false, error: 'JPEG, PNG, or WebP only.' };
    }
    if (f.size > MAX_ARTWORK_BYTES) return { ok: false, error: 'A photo is too large.' };
  }

  const { data: currentPhotos } = await supabaseAdmin
    .from('artwork_photos')
    .select('id, url')
    .eq('artwork_id', artworkId);
  const keptIds = new Set(
    order.filter((o): o is ExistingRef => o.kind === 'existing').map((o) => o.id),
  );
  const toDelete = (currentPhotos ?? []).filter((p) => !keptIds.has(p.id as string));

  if (toDelete.length > 0) {
    const paths = toDelete
      .map((p) => storagePathFromUrl(p.url as string))
      .filter((p): p is string => Boolean(p));
    if (paths.length > 0) {
      await supabaseAdmin.storage.from('artwork-photos').remove(paths);
    }
    await supabaseAdmin
      .from('artwork_photos')
      .delete()
      .in(
        'id',
        toDelete.map((p) => p.id),
      );
  }

  for (let i = 0; i < order.length; i += 1) {
    const entry = order[i];
    if (entry.kind === 'existing') {
      await supabaseAdmin
        .from('artwork_photos')
        .update({
          sort_order: i,
          focal_x: entry.focal[0],
          focal_y: entry.focal[1],
        })
        .eq('id', entry.id)
        .eq('artwork_id', artworkId);
    } else {
      const file = files[entry.new_index];
      if (!file) continue;
      const ext =
        file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
      const path = `${userId}/${artworkId}/${i}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabaseAdmin.storage
        .from('artwork-photos')
        .upload(path, file, {
          contentType: file.type,
          upsert: true,
          cacheControl: '300',
        });
      if (uploadErr) continue;
      const { data: pub } = supabaseAdmin.storage
        .from('artwork-photos')
        .getPublicUrl(path);
      await supabaseAdmin.from('artwork_photos').insert({
        artwork_id: artworkId,
        url: pub.publicUrl,
        sort_order: i,
        focal_x: entry.focal[0],
        focal_y: entry.focal[1],
      });
    }
  }

  await supabaseAdmin
    .from('artworks')
    .update({
      title: meta.data.title,
      year: meta.data.year ?? null,
      medium: meta.data.medium?.trim() || null,
      height: meta.data.height,
      width: meta.data.width,
      depth: meta.data.depth ?? null,
      artist_statement: meta.data.description?.trim() || null,
    })
    .eq('id', artworkId);

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('username')
    .eq('id', userId)
    .single();
  const username = (userRow?.username as string | undefined) ?? '';
  if (username) {
    revalidatePath(`/${username}`);
    revalidatePath(`/${username}/artwork/${artworkId}`);
  }
  revalidatePath('/app/home');

  return { ok: true };
}

export async function softDeleteArtwork(artworkId: string): Promise<ArtworkActionResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  const rl = await rateLimit(`art:delete:${userId}`, 20, 60_000);
  if (!rl.ok) return { ok: false, error: 'Too many deletes.' };

  if (!artworkId) return { ok: false, error: 'Missing artwork id.' };

  const { data: art } = await supabaseAdmin
    .from('artworks')
    .select('id, user_id')
    .eq('id', artworkId)
    .maybeSingle();
  if (!art) return { ok: false, error: 'Artwork not found.' };
  if (art.user_id !== userId) return { ok: false, error: 'Not authorized.' };

  const { error } = await supabaseAdmin
    .from('artworks')
    .update({ is_active: false })
    .eq('id', artworkId);
  if (error) return { ok: false, error: 'Could not delete.' };

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('username')
    .eq('id', userId)
    .single();
  const username = (userRow?.username as string | undefined) ?? '';
  if (username) revalidatePath(`/${username}`);
  revalidatePath('/app/home');

  return { ok: true };
}
