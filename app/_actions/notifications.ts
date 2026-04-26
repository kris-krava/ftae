'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { reportError } from '@/lib/observability';

export async function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };

  const { error } = await supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (error) {
    reportError({
      area: 'notifications',
      op: 'mark_all_read',
      err: error,
      userId: user.id,
    });
    return { ok: false };
  }
  revalidatePath('/app/notifications');
  return { ok: true };
}
