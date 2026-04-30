'use server';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { reportError } from '@/lib/observability';

// Max file size accepted by the signed-URL minter. Mirrors the bucket's
// own file_size_limit (set in 20260430000000_artwork_storage_constraints.sql)
// so a malicious client gets a clear refusal here before Storage rejects.
const MAX_ARTWORK_BYTES = 5_000_000;
const MAX_ARTWORK_PHOTOS = 6;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result<T> = { ok: true } & T | { ok: false; error: string };
export type UploadSlot = { index: number; path: string; signedUrl: string; token: string };

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user.id;
}

function extFor(mime: string): string {
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return 'jpg';
}

const FilesSchema = z
  .array(
    z.object({
      mime: z.string(),
      size: z.number().int().nonnegative(),
    }),
  )
  .min(1)
  .max(MAX_ARTWORK_PHOTOS);

export async function getArtworkUploadUrls(input: {
  files: { mime: string; size: number }[];
  artworkId?: string;
}): Promise<Result<{ artworkId: string; uploads: UploadSlot[] }>> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  // 30 mint requests per minute per user. Each piece is 1-6 files, so this
  // covers ~5+ retries of a 6-photo upload — well past anything legitimate.
  const rl = await rateLimit(`art:upload-urls:${userId}`, 30, 60_000);
  if (!rl.ok) return { ok: false, error: 'Too many uploads. Try again in a moment.' };

  const parsed = FilesSchema.safeParse(input.files);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid files.' };
  }

  for (const f of parsed.data) {
    if (!ALLOWED_MIME.has(f.mime)) return { ok: false, error: 'JPEG, PNG, or WebP only.' };
    if (f.size > MAX_ARTWORK_BYTES) return { ok: false, error: 'A photo is too large.' };
    if (f.size === 0) return { ok: false, error: 'A photo appears empty.' };
  }

  // For edit mode the caller hands us the existing artwork id; verify
  // ownership before minting URLs scoped to that path.
  let artworkId = input.artworkId;
  if (artworkId) {
    if (!UUID_RE.test(artworkId)) return { ok: false, error: 'Invalid artwork id.' };
    const { data: art } = await supabaseAdmin
      .from('artworks')
      .select('id, user_id, is_active')
      .eq('id', artworkId)
      .maybeSingle();
    if (!art) return { ok: false, error: 'Artwork not found.' };
    if (art.user_id !== userId) return { ok: false, error: 'Not authorized.' };
    if (!art.is_active) return { ok: false, error: 'Artwork is deleted.' };
  } else {
    artworkId = randomUUID();
  }

  // Mint signed PUT URLs in parallel. Path prefix is server-controlled —
  // a client can't request a URL for another user's folder because we
  // build the path from the authenticated userId.
  const uploads: UploadSlot[] = [];
  for (let i = 0; i < parsed.data.length; i += 1) {
    const file = parsed.data[i];
    const path = `${userId}/${artworkId}/${randomUUID()}.${extFor(file.mime)}`;
    const { data, error } = await supabaseAdmin.storage
      .from('artwork-photos')
      .createSignedUploadUrl(path);
    if (error || !data) {
      reportError({
        area: 'artwork-upload',
        op: 'mint_signed_url',
        err: error,
        userId,
        extra: { artworkId, photo_index: i, path },
      });
      return { ok: false, error: 'Could not prepare upload.' };
    }
    uploads.push({ index: i, path, signedUrl: data.signedUrl, token: data.token });
  }

  return { ok: true, artworkId, uploads };
}

// ---------- Commit actions (no binary data passes through these) ----------

const CommitMetaSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(160),
  year: z
    .coerce.number({ invalid_type_error: 'Year is required.' })
    .int()
    .min(1000)
    .max(new Date().getFullYear() + 1),
  medium: z.string().trim().min(1, 'Medium is required.').max(160),
  width: z.coerce.number().positive('Width must be greater than 0.').max(10000).optional().nullable(),
  height: z.coerce.number().positive('Height must be greater than 0.').max(10000).optional().nullable(),
  depth: z.coerce.number().nonnegative().max(10000).optional().nullable(),
  description: z.string().trim().max(160).optional().nullable(),
});

const FocalSchema = z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)]);

const CommitNewSchema = z.object({
  artworkId: z.string().regex(UUID_RE, 'Invalid artwork id.'),
  meta: CommitMetaSchema,
  /** Step-3-style add: dimensions are optional. */
  lite: z.boolean().default(false),
  photos: z
    .array(z.object({ path: z.string().min(1), focal: FocalSchema }))
    .min(1, 'At least one photo is required.')
    .max(MAX_ARTWORK_PHOTOS),
});

const CommitUpdateSchema = z.object({
  artworkId: z.string().regex(UUID_RE, 'Invalid artwork id.'),
  meta: CommitMetaSchema,
  lite: z.boolean().default(false),
  photos: z
    .array(
      z.discriminatedUnion('kind', [
        z.object({
          kind: z.literal('existing'),
          id: z.string().min(1),
          focal: FocalSchema,
        }),
        z.object({
          kind: z.literal('new'),
          path: z.string().min(1),
          focal: FocalSchema,
        }),
      ]),
    )
    .min(1, 'At least one photo is required.')
    .max(MAX_ARTWORK_PHOTOS),
});

// Hand-written input types because z.coerce.* narrows z.input<> back to the
// post-coerce type, hiding the fact that the meta fields actually accept
// strings from form state. Consumers (AddArtModal/EditArtModal) pass the
// trimmed form values directly without parsing them to numbers first.
export interface CommitMetaInput {
  title: string;
  year: string | number;
  medium: string;
  width?: string | number | null;
  height?: string | number | null;
  depth?: string | number | null;
  description?: string | null;
}

export interface CommitNewInput {
  artworkId: string;
  lite?: boolean;
  meta: CommitMetaInput;
  photos: { path: string; focal: [number, number] }[];
}

export interface CommitUpdateInput {
  artworkId: string;
  lite?: boolean;
  meta: CommitMetaInput;
  photos: Array<
    | { kind: 'existing'; id: string; focal: [number, number] }
    | { kind: 'new'; path: string; focal: [number, number] }
  >;
}

export type CommitResult = { ok: true } | { ok: false; error: string };

function validatePathPrefix(path: string, userId: string, artworkId: string): boolean {
  return path.startsWith(`${userId}/${artworkId}/`);
}

function publicUrlFor(path: string): string {
  const { data } = supabaseAdmin.storage.from('artwork-photos').getPublicUrl(path);
  return data.publicUrl;
}

/** Ensures every claimed path actually exists in Storage. Prevents commit
 *  with stale or fabricated paths — without this a client could insert DB
 *  rows pointing at empty objects. */
async function verifyPathsExist(paths: string[]): Promise<{ ok: true } | { ok: false; missing: string[] }> {
  // Group by parent folder so a single list() call covers the photos for
  // one artwork. A malicious client can't bypass this — a missing object
  // simply won't appear in the listing.
  const byFolder = new Map<string, string[]>();
  for (const p of paths) {
    const slash = p.lastIndexOf('/');
    if (slash < 0) return { ok: false, missing: paths };
    const folder = p.slice(0, slash);
    const filename = p.slice(slash + 1);
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder)!.push(filename);
  }
  const missing: string[] = [];
  for (const [folder, filenames] of byFolder) {
    const { data, error } = await supabaseAdmin.storage
      .from('artwork-photos')
      .list(folder, { limit: 100 });
    if (error || !data) return { ok: false, missing: paths };
    const present = new Set(data.map((o) => o.name));
    for (const fn of filenames) if (!present.has(fn)) missing.push(`${folder}/${fn}`);
  }
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

async function bumpCompletionAndReferralCredits(userId: string): Promise<void> {
  // Both helpers live in onboarding.ts; importing here would create a
  // server-action circular dep. The same Supabase calls inlined cover the
  // 100% completion + referral-credit gates triggered by adding art.
  // (Kept private to this file.)
  const [{ data: u }, { count: mediumCount }, { count: artworkCount }] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('avatar_url, name, location_city, bio')
      .eq('id', userId)
      .single(),
    supabaseAdmin.from('user_mediums').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin
      .from('artworks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true),
  ]);
  if (!u) return;

  const { computeCompletion } = await import('@/lib/profile-completion');
  const pct = computeCompletion({
    hasAvatar: Boolean(u.avatar_url),
    hasName: Boolean((u.name as string | null)?.trim()),
    hasLocation: Boolean((u.location_city as string | null)?.trim()),
    mediumCount: mediumCount ?? 0,
    hasBio: Boolean((u.bio as string | null)?.trim()),
    artworkCount: artworkCount ?? 0,
  });
  await supabaseAdmin.from('users').update({ profile_completion_pct: pct }).eq('id', userId);

  if (pct === 100) {
    const { data: openSetting } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', 'founding_member_enrollment_open')
      .maybeSingle();
    if (openSetting?.value === 'true') {
      const { count: existing } = await supabaseAdmin
        .from('membership_credits')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('credit_type', 'founding_member');
      if (!existing || existing === 0) {
        await supabaseAdmin.from('users').update({ is_founding_member: true }).eq('id', userId);
        await supabaseAdmin.from('membership_credits').insert({
          user_id: userId,
          credit_type: 'founding_member',
          months_credited: 3,
          note: 'Founding member — granted at 100% profile completion',
        });
      }
    }
  }

  // Idempotent referral-credit fire (mirrors tryIssueReferralCreditOnArt).
  const { data: referral } = await supabaseAdmin
    .from('referrals')
    .select('id, referrer_user_id')
    .eq('referred_user_id', userId)
    .eq('credit_issued', false)
    .maybeSingle();
  if (!referral) return;

  const { data: refd } = await supabaseAdmin
    .from('users')
    .select('username, name')
    .eq('id', userId)
    .single();
  const referrerId = referral.referrer_user_id as string;

  const { count: bonusCount } = await supabaseAdmin
    .from('membership_credits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', referrerId)
    .eq('credit_type', 'referral_bonus');
  const referrerName = (refd?.name as string | null) ?? (refd?.username as string | null) ?? 'A friend';

  if ((bonusCount ?? 0) < 3) {
    await supabaseAdmin.from('membership_credits').insert({
      user_id: referrerId,
      credit_type: 'referral_bonus',
      months_credited: 1,
      note: `Referred ${referrerName}`,
    });
    await supabaseAdmin.from('notifications').insert({
      user_id: referrerId,
      type: 'referral_credit',
      payload: { referred_user_id: userId, referred_name: referrerName },
    });
  } else {
    await supabaseAdmin.from('notifications').insert({
      user_id: referrerId,
      type: 'referral_joined_capped',
      payload: { referred_user_id: userId, referred_name: referrerName },
    });
  }
  await supabaseAdmin.from('referrals').update({ credit_issued: true }).eq('id', referral.id);
}

export async function commitNewArtwork(input: CommitNewInput): Promise<CommitResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  const rl = await rateLimit(`art:commit-new:${userId}`, 10, 60_000);
  if (!rl.ok) return { ok: false, error: 'Too many uploads.' };

  const parsed = CommitNewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const { artworkId, meta, lite, photos } = parsed.data;

  // In lite mode (onboarding step 3) dimensions are deferred — commit
  // accepts null for width/height so the user isn't gated on them.
  if (!lite) {
    if (meta.width == null) return { ok: false, error: 'Width is required.' };
    if (meta.height == null) return { ok: false, error: 'Height is required.' };
  }

  for (const p of photos) {
    if (!validatePathPrefix(p.path, userId, artworkId)) {
      return { ok: false, error: 'Invalid photo path.' };
    }
  }

  // Make sure another artwork with this id wasn't somehow already committed
  // (should be impossible given a fresh UUID per mint, but cheap to verify
  // before we INSERT).
  const { data: existing } = await supabaseAdmin
    .from('artworks')
    .select('id')
    .eq('id', artworkId)
    .maybeSingle();
  if (existing) return { ok: false, error: 'Artwork already exists.' };

  const verify = await verifyPathsExist(photos.map((p) => p.path));
  if (!verify.ok) {
    return { ok: false, error: 'Some photos didn’t finish uploading. Try again.' };
  }

  const { error: artErr } = await supabaseAdmin.from('artworks').insert({
    id: artworkId,
    user_id: userId,
    title: meta.title,
    year: meta.year ?? null,
    medium: meta.medium?.trim() || null,
    height: meta.height ?? null,
    width: meta.width ?? null,
    depth: meta.depth ?? null,
    dimension_unit: 'in',
    artist_statement: meta.description?.trim() || null,
    is_trade_available: true,
    is_active: true,
  });
  if (artErr) {
    reportError({ area: 'artwork-upload', op: 'insert_artwork', err: artErr, userId, extra: { artworkId } });
    return { ok: false, error: 'Could not save artwork.' };
  }

  const photoRows = photos.map((p, i) => ({
    artwork_id: artworkId,
    url: publicUrlFor(p.path),
    sort_order: i,
    focal_x: p.focal[0],
    focal_y: p.focal[1],
  }));
  const { error: photoErr } = await supabaseAdmin.from('artwork_photos').insert(photoRows);
  if (photoErr) {
    // Roll back the artwork row so we don't leave a 0-photo artwork
    // dangling in the home feed. The Storage objects become orphans and
    // get swept by the daily cron.
    await supabaseAdmin.from('artworks').delete().eq('id', artworkId);
    reportError({
      area: 'artwork-upload',
      op: 'insert_photos',
      err: photoErr,
      userId,
      extra: { artworkId },
    });
    return { ok: false, error: 'Could not save photos.' };
  }

  await bumpCompletionAndReferralCredits(userId);

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

export async function commitArtworkUpdate(input: CommitUpdateInput): Promise<CommitResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  const rl = await rateLimit(`art:commit-update:${userId}`, 20, 60_000);
  if (!rl.ok) return { ok: false, error: 'Too many updates.' };

  const parsed = CommitUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }
  const { artworkId, meta, lite, photos } = parsed.data;

  if (!lite) {
    if (meta.width == null) return { ok: false, error: 'Width is required.' };
    if (meta.height == null) return { ok: false, error: 'Height is required.' };
  }

  const { data: art } = await supabaseAdmin
    .from('artworks')
    .select('id, user_id, is_active')
    .eq('id', artworkId)
    .maybeSingle();
  if (!art) return { ok: false, error: 'Artwork not found.' };
  if (art.user_id !== userId) return { ok: false, error: 'Not authorized.' };
  if (!art.is_active) return { ok: false, error: 'Artwork is deleted.' };

  const newPaths: string[] = [];
  for (const p of photos) {
    if (p.kind === 'new') {
      if (!validatePathPrefix(p.path, userId, artworkId)) {
        return { ok: false, error: 'Invalid photo path.' };
      }
      newPaths.push(p.path);
    }
  }
  if (newPaths.length > 0) {
    const verify = await verifyPathsExist(newPaths);
    if (!verify.ok) {
      return { ok: false, error: 'Some photos didn’t finish uploading. Try again.' };
    }
  }

  // Reconcile existing photos: delete anything not in the new order.
  const keptIds = new Set(
    photos.filter((p): p is Extract<typeof p, { kind: 'existing' }> => p.kind === 'existing').map((p) => p.id),
  );
  const { data: currentPhotos } = await supabaseAdmin
    .from('artwork_photos')
    .select('id, url')
    .eq('artwork_id', artworkId);
  const toDelete = (currentPhotos ?? []).filter((row) => !keptIds.has(row.id as string));
  if (toDelete.length > 0) {
    const paths = toDelete
      .map((row) => {
        const url = row.url as string;
        const idx = url.indexOf('/artwork-photos/');
        return idx >= 0 ? url.slice(idx + '/artwork-photos/'.length) : null;
      })
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

  const photoOps = await Promise.all(
    photos.map(async (p, i) => {
      if (p.kind === 'existing') {
        const { error } = await supabaseAdmin
          .from('artwork_photos')
          .update({ sort_order: i, focal_x: p.focal[0], focal_y: p.focal[1] })
          .eq('id', p.id)
          .eq('artwork_id', artworkId);
        return error ? { ok: false as const, index: i } : { ok: true as const };
      }
      const { error } = await supabaseAdmin.from('artwork_photos').insert({
        artwork_id: artworkId,
        url: publicUrlFor(p.path),
        sort_order: i,
        focal_x: p.focal[0],
        focal_y: p.focal[1],
      });
      return error ? { ok: false as const, index: i } : { ok: true as const };
    }),
  );
  const failed = photoOps.filter((r): r is { ok: false; index: number } => !r.ok);

  await supabaseAdmin
    .from('artworks')
    .update({
      title: meta.title,
      year: meta.year ?? null,
      medium: meta.medium?.trim() || null,
      height: meta.height ?? null,
      width: meta.width ?? null,
      depth: meta.depth ?? null,
      artist_statement: meta.description?.trim() || null,
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

  if (failed.length > 0) {
    const positions = failed.map((f) => f.index + 1).join(', ');
    return {
      ok: false,
      error:
        failed.length === photos.length
          ? 'No photos saved. Please try again.'
          : `Saved metadata + ${photos.length - failed.length} of ${photos.length} photos. Photo ${positions} couldn’t save — please try again.`,
    };
  }

  return { ok: true };
}
