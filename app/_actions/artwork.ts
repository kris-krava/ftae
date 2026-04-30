'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';

export type ArtworkActionResult = { ok: true } | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user.id;
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
