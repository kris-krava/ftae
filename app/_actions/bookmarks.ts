'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';

export type BookmarkResult =
  | { ok: true; bookmarked: boolean }
  | { ok: false; error: string };

export async function toggleBookmark(artworkId: string): Promise<BookmarkResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in to bookmark.' };

  const { data: artwork, error: artworkErr } = await supabaseAdmin
    .from('artworks')
    .select('user_id, is_active')
    .eq('id', artworkId)
    .maybeSingle();
  if (artworkErr || !artwork || !artwork.is_active) {
    return { ok: false, error: 'Artwork not found.' };
  }
  if (artwork.user_id === user.id) {
    return { ok: false, error: 'You cannot bookmark your own art.' };
  }

  const limit = await rateLimit(`bookmark:${user.id}`, 60, 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many actions.' };

  const { data: existing } = await supabaseAdmin
    .from('artwork_bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('artwork_id', artworkId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin
      .from('artwork_bookmarks')
      .delete()
      .eq('id', existing.id);
    if (error) return { ok: false, error: 'Could not remove bookmark.' };
    revalidatePath('/app/trades');
    return { ok: true, bookmarked: false };
  }

  const { error } = await supabaseAdmin.from('artwork_bookmarks').insert({
    user_id: user.id,
    artwork_id: artworkId,
  });
  if (error) return { ok: false, error: 'Could not save bookmark.' };
  revalidatePath('/app/trades');
  return { ok: true, bookmarked: true };
}
