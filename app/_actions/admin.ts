'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';

export type AdminToggleResult = { ok: true; isActive: boolean } | { ok: false; error: string };

export async function toggleUserActive(
  targetUserId: string,
  currentlyActive: boolean,
): Promise<AdminToggleResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  // Verify the caller is admin via the privileged client (bypasses RLS).
  const { data: caller } = await supabaseAdmin
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single();
  if (!caller || caller.is_active === false) return { ok: false, error: 'Unauthorized.' };
  if (caller.role !== 'admin' && caller.role !== 'super_admin') {
    return { ok: false, error: 'Unauthorized.' };
  }

  const limit = await rateLimit(`admin-toggle:${user.id}`, 30, 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many actions. Please slow down.' };

  if (targetUserId === user.id) {
    return { ok: false, error: 'You cannot deactivate yourself.' };
  }

  const nextActive = !currentlyActive;

  const { error: updateError } = await supabaseAdmin
    .from('users')
    .update({ is_active: nextActive })
    .eq('id', targetUserId);
  if (updateError) {
    console.error('admin toggle update failed:', updateError);
    return { ok: false, error: 'Could not update user.' };
  }

  const { error: actionError } = await supabaseAdmin.from('admin_actions').insert({
    admin_user_id: user.id,
    target_user_id: targetUserId,
    action_type: nextActive ? 'activate' : 'deactivate',
  });
  if (actionError) {
    console.error('admin_actions insert failed:', actionError);
    // Don't fail the request — the toggle succeeded.
  }

  revalidatePath('/admin');
  return { ok: true, isActive: nextActive };
}
