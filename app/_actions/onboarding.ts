'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { computeCompletion } from '@/lib/profile-completion';
import { rateLimit } from '@/lib/rate-limit';
import { isReservedUsername } from '@/lib/username-rules';
import { validateUsername } from '@/lib/username-validation';
import { reportError } from '@/lib/observability';

const SOCIAL_PLATFORMS = ['instagram', 'facebook', 'x', 'tiktok', 'youtube', 'pinterest', 'linkedin'] as const;
type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_AVATAR_BYTES = 1_500_000;
const MAX_ARTWORK_BYTES = 5_000_000;
const MAX_ARTWORK_PHOTOS = 6;

export type SaveResult = { ok: true } | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user.id;
}

async function recalculateCompletion(userId: string): Promise<number> {
  const [{ data: u }, { count: mediumCount }, { count: artworkCount }] = await Promise.all([
    supabaseAdmin
      .from('users')
      .select('avatar_url, name, location_city, bio, website_url, social_handle')
      .eq('id', userId)
      .single(),
    supabaseAdmin.from('user_mediums').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    supabaseAdmin
      .from('artworks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true),
  ]);

  if (!u) return 0;

  const pct = computeCompletion({
    hasAvatar: Boolean(u.avatar_url),
    hasName: Boolean(u.name?.trim()),
    hasLocation: Boolean(u.location_city?.trim()),
    mediumCount: mediumCount ?? 0,
    hasBio: Boolean(u.bio?.trim()),
    hasLinks: Boolean(u.website_url?.trim() || u.social_handle?.trim()),
    artworkCount: artworkCount ?? 0,
  });

  await supabaseAdmin.from('users').update({ profile_completion_pct: pct }).eq('id', userId);
  return pct;
}

const Step1ProfileSchema = z.object({
  name: z.string().trim().max(80).optional().nullable(),
  location_city: z.string().trim().max(120).optional().nullable(),
  username: z.string().trim().max(30).optional().nullable(),
});

export async function saveStep1Profile(formData: FormData): Promise<SaveResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  const limit = await rateLimit(`step1:${userId}`, 60, 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many saves. Please wait a moment.' };

  const parsed = Step1ProfileSchema.safeParse({
    name: formData.get('name'),
    location_city: formData.get('location_city'),
    username: formData.get('username'),
  });
  if (!parsed.success) return { ok: false, error: 'Invalid input.' };

  const update: Record<string, string | null> = {
    name: parsed.data.name?.trim() || null,
    location_city: parsed.data.location_city?.trim() || null,
  };

  if (parsed.data.username !== undefined) {
    const raw = (parsed.data.username ?? '').trim().toLowerCase();
    if (raw.length > 0) {
      if (isReservedUsername(raw)) return { ok: false, error: 'That username is reserved.' };
      const v = validateUsername(raw);
      if (!v.ok) return { ok: false, error: v.reason };
      const { data: clash } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('username', raw)
        .neq('id', userId)
        .maybeSingle();
      if (clash) return { ok: false, error: 'That username is taken.' };
      update.username = raw;
    }
  }

  const { error } = await supabaseAdmin
    .from('users')
    .update(update)
    .eq('id', userId);

  if (error) return { ok: false, error: 'Could not save.' };

  await recalculateCompletion(userId);
  revalidatePath('/onboarding/step-1');
  return { ok: true };
}

export async function checkUsernameAvailability(
  raw: string,
): Promise<{ available: boolean; error?: string }> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { available: false, error: 'Not signed in.' };
  }
  const candidate = (raw ?? '').trim().toLowerCase();
  if (candidate.length === 0) return { available: false, error: 'Enter a username.' };
  if (isReservedUsername(candidate)) return { available: false, error: 'That username is reserved.' };
  const v = validateUsername(candidate);
  if (!v.ok) return { available: false, error: v.reason };
  const { data: clash } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('username', candidate)
    .neq('id', userId)
    .maybeSingle();
  if (clash) return { available: false, error: 'Taken' };
  return { available: true };
}

export async function finalizeStep1(): Promise<SaveResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  const limit = await rateLimit(`step1-finalize:${userId}`, 20, 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many attempts. Please wait a moment.' };

  const { data: row, error: readErr } = await supabaseAdmin
    .from('users')
    .select('name, location_city, avatar_url, username, terms_accepted_at')
    .eq('id', userId)
    .single();

  if (readErr || !row) return { ok: false, error: 'Could not load profile.' };

  if (!row.name?.trim()) return { ok: false, error: 'Please add your display name.' };
  if (!row.location_city?.trim()) return { ok: false, error: 'Please add your location.' };
  if (!row.avatar_url) return { ok: false, error: 'Please add a profile photo.' };
  if (!row.username?.trim()) return { ok: false, error: 'Please choose a username.' };
  const v = validateUsername((row.username as string).trim().toLowerCase());
  if (!v.ok) return { ok: false, error: v.reason };

  if (!row.terms_accepted_at) {
    const { error: stampErr } = await supabaseAdmin
      .from('users')
      .update({ terms_accepted_at: new Date().toISOString() })
      .eq('id', userId)
      .is('terms_accepted_at', null);
    if (stampErr) return { ok: false, error: 'Could not record terms agreement.' };
  }

  revalidatePath('/onboarding/step-1');
  return { ok: true };
}

export async function uploadAvatar(formData: FormData): Promise<SaveResult & { avatarUrl?: string }> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  const limit = await rateLimit(`avatar:${userId}`, 8, 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many uploads. Please wait a moment.' };

  const file = formData.get('avatar');
  if (!(file instanceof File)) return { ok: false, error: 'No file provided.' };
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { ok: false, error: 'JPEG, PNG, or WebP only.' };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: 'File too large.' };
  }

  // Aspect ratio is sent by the client (where it knows the natural pixel
  // dimensions of the compressed image) so display code can compute
  // object-position via lib/focal-point without loading the image again.
  const aspectRaw = formData.get('aspect');
  const aspect = typeof aspectRaw === 'string' ? Number.parseFloat(aspectRaw) : NaN;
  const aspectRatio = Number.isFinite(aspect) && aspect > 0 ? aspect : null;

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type, upsert: true, cacheControl: '300' });
  if (uploadError) return { ok: false, error: 'Upload failed.' };

  const { data: pub } = supabaseAdmin.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = `${pub.publicUrl}?v=${Date.now()}`;

  // New upload resets the focal to center — old focal would point at a
  // location in the previous image that may not exist (or look weird) in
  // the new one.
  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({
      avatar_url: avatarUrl,
      avatar_focal_x: 0.5,
      avatar_focal_y: 0.5,
      avatar_aspect_ratio: aspectRatio,
    })
    .eq('id', userId);
  if (updateError) return { ok: false, error: 'Could not save.' };

  await recalculateCompletion(userId);
  revalidatePath('/onboarding/step-1');
  return { ok: true, avatarUrl };
}

const FocalSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

export async function setAvatarFocal(focal: { x: number; y: number }): Promise<SaveResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  const limit = await rateLimit(`avatar-focal:${userId}`, 30, 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many updates. Please wait a moment.' };

  const parsed = FocalSchema.safeParse(focal);
  if (!parsed.success) return { ok: false, error: 'Invalid focal point.' };

  const { error } = await supabaseAdmin
    .from('users')
    .update({ avatar_focal_x: parsed.data.x, avatar_focal_y: parsed.data.y })
    .eq('id', userId);
  if (error) return { ok: false, error: 'Could not save.' };

  return { ok: true };
}

const MediumIdSchema = z.string().uuid();

export async function saveStep2Mediums(mediumIds: string[]): Promise<SaveResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  const limit = await rateLimit(`step2-mediums:${userId}`, 60, 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many saves.' };

  const cleanIds = Array.from(new Set(mediumIds))
    .filter((id) => MediumIdSchema.safeParse(id).success)
    .slice(0, 50);

  // Validate IDs exist in mediums table
  if (cleanIds.length > 0) {
    const { data: valid } = await supabaseAdmin
      .from('mediums')
      .select('id')
      .in('id', cleanIds);
    const validSet = new Set((valid ?? []).map((r) => r.id as string));
    const filtered = cleanIds.filter((id) => validSet.has(id));

    await supabaseAdmin.from('user_mediums').delete().eq('user_id', userId);
    if (filtered.length > 0) {
      await supabaseAdmin
        .from('user_mediums')
        .insert(filtered.map((medium_id) => ({ user_id: userId, medium_id })));
    }
  } else {
    await supabaseAdmin.from('user_mediums').delete().eq('user_id', userId);
  }

  await recalculateCompletion(userId);
  revalidatePath('/onboarding/step-2');
  return { ok: true };
}

const BioSchema = z.string().max(160);

export async function saveStep2Bio(bio: string): Promise<SaveResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  const limit = await rateLimit(`step2-bio:${userId}`, 60, 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many saves.' };

  const parsed = BioSchema.safeParse(bio);
  if (!parsed.success) return { ok: false, error: 'Bio is too long.' };

  const { error } = await supabaseAdmin
    .from('users')
    .update({ bio: parsed.data.trim() || null })
    .eq('id', userId);
  if (error) return { ok: false, error: 'Could not save.' };

  await recalculateCompletion(userId);
  revalidatePath('/onboarding/step-2');
  return { ok: true };
}

const Step3Schema = z.object({
  website_url: z
    .string()
    .trim()
    .max(300)
    .optional()
    .nullable()
    .refine((v) => {
      if (!v) return true;
      try {
        const url = new URL(v.startsWith('http') ? v : `https://${v}`);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }, { message: 'Invalid URL' }),
  social_platform: z.enum(SOCIAL_PLATFORMS).optional().nullable(),
  social_handle: z.string().trim().max(60).optional().nullable(),
});

export async function saveStep3Links(formData: FormData): Promise<SaveResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  const limit = await rateLimit(`step3:${userId}`, 30, 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many saves.' };

  const platformRaw = formData.get('social_platform');
  const handleRaw = formData.get('social_handle');
  const websiteRaw = formData.get('website_url');

  const parsed = Step3Schema.safeParse({
    website_url: typeof websiteRaw === 'string' ? websiteRaw : null,
    social_platform:
      typeof platformRaw === 'string' && platformRaw.length > 0 ? platformRaw : null,
    social_handle: typeof handleRaw === 'string' ? handleRaw : null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const website = parsed.data.website_url?.trim() || null;
  const websiteNormalized = website && !website.startsWith('http') ? `https://${website}` : website;

  const platform = (parsed.data.social_platform ?? null) as SocialPlatform | null;
  const handle = parsed.data.social_handle?.trim().replace(/^@+/, '') || null;
  const finalPlatform = handle ? platform : null;
  const finalHandle = handle && platform ? handle : null;

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      website_url: websiteNormalized,
      social_platform: finalPlatform,
      social_handle: finalHandle,
    })
    .eq('id', userId);
  if (error) return { ok: false, error: 'Could not save.' };

  await recalculateCompletion(userId);
  revalidatePath('/onboarding/step-3');
  return { ok: true };
}

const Step4MetaSchema = z.object({
  title: z.string().trim().min(1, 'Title is required.').max(160),
  year: z.coerce.number({ invalid_type_error: 'Year is required.' })
    .int()
    .min(1000)
    .max(new Date().getFullYear() + 1),
  medium: z.string().trim().min(1, 'Medium is required.').max(160),
  width:  z.coerce.number({ invalid_type_error: 'Width is required.' }).positive('Width must be greater than 0.').max(10000),
  height: z.coerce.number({ invalid_type_error: 'Height is required.' }).positive('Height must be greater than 0.').max(10000),
  depth:  z.coerce.number().nonnegative().max(10000).optional().nullable(),
  description: z.string().trim().max(160).optional().nullable(),
});

export async function saveStep4Artwork(formData: FormData): Promise<SaveResult> {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    return { ok: false, error: 'Not signed in.' };
  }

  const limit = await rateLimit(`step4:${userId}`, 10, 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many uploads.' };

  const photoEntries = formData.getAll('photos');
  const photos: File[] = [];
  for (const entry of photoEntries) {
    if (entry instanceof File && entry.size > 0) photos.push(entry);
  }
  if (photos.length === 0) return { ok: false, error: 'At least one photo is required.' };
  if (photos.length > MAX_ARTWORK_PHOTOS) return { ok: false, error: `Up to ${MAX_ARTWORK_PHOTOS} photos.` };

  for (const photo of photos) {
    if (!ALLOWED_IMAGE_TYPES.has(photo.type)) return { ok: false, error: 'JPEG, PNG, or WebP only.' };
    if (photo.size > MAX_ARTWORK_BYTES) return { ok: false, error: 'A photo is too large.' };
  }

  // Per-photo focal points arrive as a JSON array aligned to photos order.
  // Each entry is [x, y] with values in [0, 1]. Fall back to centered if the
  // field is absent, malformed, or out of bounds.
  const focalsRaw = formData.get('photo_focals');
  const focals: { x: number; y: number }[] = photos.map(() => ({ x: 0.5, y: 0.5 }));
  if (typeof focalsRaw === 'string') {
    try {
      const parsed = JSON.parse(focalsRaw);
      if (Array.isArray(parsed)) {
        for (let i = 0; i < focals.length && i < parsed.length; i += 1) {
          const entry = parsed[i];
          if (Array.isArray(entry) && entry.length === 2) {
            const [x, y] = entry;
            if (typeof x === 'number' && typeof y === 'number' && x >= 0 && x <= 1 && y >= 0 && y <= 1) {
              focals[i] = { x, y };
            }
          }
        }
      }
    } catch {
      // Keep defaults on parse failure.
    }
  }

  const depthRaw = formData.get('depth');
  const descriptionRaw = formData.get('description');
  const meta = Step4MetaSchema.safeParse({
    title: formData.get('title'),
    year: formData.get('year') || undefined,
    medium: formData.get('medium'),
    width: formData.get('width') || undefined,
    height: formData.get('height') || undefined,
    depth: depthRaw !== null && String(depthRaw).trim() !== '' ? depthRaw : undefined,
    description: typeof descriptionRaw === 'string' ? descriptionRaw : null,
  });
  if (!meta.success) {
    return { ok: false, error: meta.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { data: artwork, error: artErr } = await supabaseAdmin
    .from('artworks')
    .insert({
      user_id: userId,
      title: meta.data.title,
      year: meta.data.year ?? null,
      medium: meta.data.medium?.trim() || null,
      height: meta.data.height,
      width: meta.data.width,
      depth: meta.data.depth ?? null,
      dimension_unit: 'in',
      artist_statement: meta.data.description?.trim() || null,
      is_trade_available: true,
      is_active: true,
    })
    .select('id')
    .single();
  if (artErr || !artwork) return { ok: false, error: 'Could not save artwork.' };

  for (let i = 0; i < photos.length; i += 1) {
    const photo = photos[i];
    const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/${artwork.id}/${i}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('artwork-photos')
      .upload(path, photo, { contentType: photo.type, upsert: true, cacheControl: '300' });
    if (uploadError) {
      reportError({
        area: 'onboarding',
        op: 'photo_upload',
        err: uploadError,
        userId,
        extra: { artwork_id: artwork.id, photo_index: i, path },
      });
      continue;
    }

    const { data: pub } = supabaseAdmin.storage.from('artwork-photos').getPublicUrl(path);

    await supabaseAdmin.from('artwork_photos').insert({
      artwork_id: artwork.id,
      url: pub.publicUrl,
      sort_order: i,
      focal_x: focals[i].x,
      focal_y: focals[i].y,
    });
  }

  const newPct = await recalculateCompletion(userId);

  if (newPct === 100) {
    await tryGrantFoundingMemberCredit(userId);
    await tryIssueReferralBonus(userId);
  }

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('username')
    .eq('id', userId)
    .single();
  if (userRow?.username) revalidatePath(`/${userRow.username as string}`);
  revalidatePath('/app/home');
  return { ok: true };
}

// Founding-member status + credit are awarded only when the user reaches 100%
// completion (first artwork added) AND enrollment is still open. They are not
// granted at signup — a user who never finishes onboarding never becomes a
// founding member, even if enrollment was open when they first clicked the
// magic link.
async function tryGrantFoundingMemberCredit(userId: string): Promise<void> {
  const { data: openSetting } = await supabaseAdmin
    .from('platform_settings')
    .select('value')
    .eq('key', 'founding_member_enrollment_open')
    .maybeSingle();
  if (openSetting?.value !== 'true') return;

  const { count: existingCount } = await supabaseAdmin
    .from('membership_credits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('credit_type', 'founding_member');
  if (existingCount && existingCount > 0) return;

  await supabaseAdmin
    .from('users')
    .update({ is_founding_member: true })
    .eq('id', userId);

  const { error: creditError } = await supabaseAdmin.from('membership_credits').insert({
    user_id: userId,
    credit_type: 'founding_member',
    months_credited: 3,
    note: 'Founding member — granted at 100% profile completion',
  });
  if (creditError) {
    reportError({
      area: 'onboarding',
      op: 'founding_member_credit',
      err: creditError,
      userId,
    });
  }
}

async function tryIssueReferralBonus(referredUserId: string): Promise<void> {
  const { data: referral } = await supabaseAdmin
    .from('referrals')
    .select('id, referrer_user_id, profile_completed_at, credit_issued')
    .eq('referred_user_id', referredUserId)
    .is('profile_completed_at', null)
    .maybeSingle();
  if (!referral) return;

  await supabaseAdmin
    .from('referrals')
    .update({ profile_completed_at: new Date().toISOString() })
    .eq('id', referral.id);

  const { count: bonusCount } = await supabaseAdmin
    .from('membership_credits')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', referral.referrer_user_id)
    .eq('credit_type', 'referral_bonus');

  if ((bonusCount ?? 0) >= 3) return;

  const { error: creditErr } = await supabaseAdmin.from('membership_credits').insert({
    user_id: referral.referrer_user_id,
    credit_type: 'referral_bonus',
    months_credited: 1,
    source_referral_id: referral.id,
    note: 'Referral bonus — referred artist completed profile',
  });
  if (creditErr) {
    reportError({
      area: 'onboarding',
      op: 'referral_credit',
      err: creditErr,
      userId: referral.referrer_user_id,
      extra: { referral_id: referral.id, referred_user_id: referredUserId },
    });
    return;
  }

  await supabaseAdmin.from('referrals').update({ credit_issued: true }).eq('id', referral.id);

  await supabaseAdmin.from('notifications').insert({
    user_id: referral.referrer_user_id,
    type: 'referral_completed',
    message: 'A referred artist completed their profile — you earned a bonus month!',
    is_read: false,
  });
}

export async function continueToStep(targetStep: 2 | 3 | 4 | 'success'): Promise<void> {
  const path = targetStep === 'success' ? '/onboarding/success' : `/onboarding/step-${targetStep}`;
  redirect(path);
}
