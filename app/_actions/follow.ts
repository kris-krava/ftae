'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { reportError } from '@/lib/observability';

export type FollowResult = { ok: true; following: boolean } | { ok: false; error: string };

export async function toggleFollow(targetUserId: string, targetUsername: string): Promise<FollowResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Sign in to follow.' };
  if (user.id === targetUserId) return { ok: false, error: 'Cannot follow yourself.' };

  const limit = await rateLimit(`follow:${user.id}`, 60, 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many actions.' };

  const { data: existing } = await supabaseAdmin
    .from('follows')
    .select('id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabaseAdmin.from('follows').delete().eq('id', existing.id);
    if (error) {
      reportError({
        area: 'follow',
        op: 'delete',
        err: error,
        userId: user.id,
        extra: { target_user_id: targetUserId },
      });
      return { ok: false, error: 'Could not unfollow.' };
    }
    revalidatePath(`/${targetUsername}`);
    return { ok: true, following: false };
  }

  const { error } = await supabaseAdmin.from('follows').insert({
    follower_id: user.id,
    following_id: targetUserId,
    is_queued: true,
  });
  if (error) {
    reportError({
      area: 'follow',
      op: 'insert',
      err: error,
      userId: user.id,
      extra: { target_user_id: targetUserId },
    });
    return { ok: false, error: 'Could not follow.' };
  }
  revalidatePath(`/${targetUsername}`);
  return { ok: true, following: true };
}
