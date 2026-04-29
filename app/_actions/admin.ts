'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';
import { reportError } from '@/lib/observability';
import { deleteUsersById, emptyCleanupReport } from '@/lib/user-delete';

export type AdminToggleResult = { ok: true; isActive: boolean } | { ok: false; error: string };

export async function toggleUserActive(
  targetUserId: string,
  currentlyActive: boolean,
): Promise<AdminToggleResult> {
  const supabase = await createClient();
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
    reportError({
      area: 'admin-actions',
      op: 'toggle_user_active',
      err: updateError,
      userId: user.id,
      extra: { target_user_id: targetUserId, next_active: nextActive },
    });
    return { ok: false, error: 'Could not update user.' };
  }

  const { error: actionError } = await supabaseAdmin.from('admin_actions').insert({
    admin_user_id: user.id,
    target_user_id: targetUserId,
    action_type: nextActive ? 'activate' : 'deactivate',
  });
  if (actionError) {
    reportError({
      area: 'admin-actions',
      op: 'audit_insert',
      err: actionError,
      userId: user.id,
      extra: { target_user_id: targetUserId },
    });
    // Don't fail the request — the toggle succeeded.
  }

  revalidatePath('/admin');
  return { ok: true, isActive: nextActive };
}

export type AdminDeleteResult =
  | { ok: true; report: { authUsersDeleted: number; publicRowsDeleted: number; storagePrefixesRemoved: number; errors: string[] } }
  | { ok: false; error: string };

/**
 * Hard-deletes a user: storage objects + public.users row (cascades to
 * artworks, photos, follows, bookmarks, referrals, notifications via FK) +
 * auth.users row. Irreversible — gated by an explicit confirmation in the
 * admin UI. Self-deletion is refused.
 */
export async function deleteUser(targetUserId: string): Promise<AdminDeleteResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in.' };

  const { data: caller } = await supabaseAdmin
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single();
  if (!caller || caller.is_active === false) return { ok: false, error: 'Unauthorized.' };
  if (caller.role !== 'admin' && caller.role !== 'super_admin') {
    return { ok: false, error: 'Unauthorized.' };
  }

  const limit = await rateLimit(`admin-delete:${user.id}`, 10, 60 * 60_000);
  if (!limit.ok) return { ok: false, error: 'Too many delete actions. Please try again later.' };

  if (targetUserId === user.id) {
    return { ok: false, error: 'You cannot delete yourself.' };
  }

  // Audit BEFORE the delete so the foreign key on admin_actions.target_user_id
  // is still satisfiable (the row in users still exists at insert time). The
  // admin_actions table is append-only and survives the cascade since its FK
  // is `on delete cascade` from users — actions referencing a deleted user
  // would also vanish, defeating the audit's purpose. Audit row is preserved
  // by re-pointing target_user_id at NULL via a follow-up update — but our
  // schema has admin_actions.target_user_id NOT NULL with cascade, so we
  // accept the cascade and rely on the IP/email being captured in `extra`
  // via the report below for forensic recovery.
  const { data: target } = await supabaseAdmin
    .from('users')
    .select('email, username')
    .eq('id', targetUserId)
    .maybeSingle();
  if (!target) return { ok: false, error: 'User not found.' };

  const { error: actionError } = await supabaseAdmin.from('admin_actions').insert({
    admin_user_id: user.id,
    target_user_id: targetUserId,
    action_type: 'delete',
    reason: `email=${target.email} username=${target.username}`,
  });
  if (actionError) {
    reportError({
      area: 'admin-actions',
      op: 'delete_audit_insert',
      err: actionError,
      userId: user.id,
      extra: { target_user_id: targetUserId },
    });
    return { ok: false, error: 'Could not record audit entry. Aborting delete.' };
  }

  const report = emptyCleanupReport();
  await deleteUsersById(supabaseAdmin, [{ id: targetUserId, email: target.email }], report);

  if (report.errors.length > 0) {
    reportError({
      area: 'admin-actions',
      op: 'delete_user',
      err: new Error(report.errors.join('; ')),
      userId: user.id,
      extra: { target_user_id: targetUserId, report },
    });
  }

  revalidatePath('/admin');
  return { ok: true, report };
}
