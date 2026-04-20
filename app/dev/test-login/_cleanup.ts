import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

import { TEST_DOMAIN_MATCH } from './_guard';

export interface CleanupReport {
  authUsersDeleted: number;
  publicRowsDeleted: number;
  storagePrefixesRemoved: number;
  errors: string[];
}

/**
 * Deletes every user whose email matches @test.ftae.local (both the auth.users
 * row and — for defense in depth — any orphaned public.users row).
 *
 * Most downstream tables (user_mediums, artworks, artwork_photos, follows,
 * referrals, notifications, membership_credits, user_ips) FK to public.users
 * with `on delete cascade`, so deleting public.users clears their data.
 * We also best-effort remove avatar / artwork-photos storage objects owned
 * by the deleted users.
 */
export async function cleanupAllTestUsers(admin: SupabaseClient): Promise<CleanupReport> {
  const report: CleanupReport = {
    authUsersDeleted: 0,
    publicRowsDeleted: 0,
    storagePrefixesRemoved: 0,
    errors: [],
  };

  const testUsers: { id: string; email: string }[] = [];

  // Paginate through auth.users; collect anything in the test domain.
  let page = 1;
  const perPage = 100;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) { report.errors.push(`auth.admin.listUsers: ${error.message}`); break; }
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email && TEST_DOMAIN_MATCH.test(u.email)) testUsers.push({ id: u.id, email: u.email });
    }
    if (users.length < perPage) break;
    page += 1;
  }

  // Also catch public.users rows with a matching email (in case auth row was
  // deleted manually and left an orphan).
  const { data: orphanRows } = await admin
    .from('users')
    .select('id, email')
    .like('email', '%@test.ftae.local');
  for (const r of orphanRows ?? []) {
    if (!testUsers.find((t) => t.id === r.id)) testUsers.push({ id: r.id, email: r.email });
  }

  for (const u of testUsers) {
    // Clean storage before the cascade kills the public.users row. Bucket
    // layouts: avatars/{userId}/... and artwork-photos/{userId}/...
    for (const bucket of ['avatars', 'artwork-photos']) {
      try {
        const { data: objects } = await admin.storage.from(bucket).list(u.id, { limit: 1000 });
        if (objects && objects.length > 0) {
          const paths = objects.map((o) => `${u.id}/${o.name}`);
          const { error: rmErr } = await admin.storage.from(bucket).remove(paths);
          if (rmErr) report.errors.push(`${bucket} remove for ${u.id}: ${rmErr.message}`);
          else report.storagePrefixesRemoved += 1;
        }
      } catch (err) {
        report.errors.push(`${bucket} list for ${u.id}: ${(err as Error).message}`);
      }
    }

    // Delete the public.users row (cascades to the rest).
    const { error: pubErr } = await admin.from('users').delete().eq('id', u.id);
    if (pubErr) report.errors.push(`users delete ${u.id}: ${pubErr.message}`);
    else report.publicRowsDeleted += 1;

    // Delete the auth.users row.
    const { error: authErr } = await admin.auth.admin.deleteUser(u.id);
    if (authErr) report.errors.push(`auth.admin.deleteUser ${u.id}: ${authErr.message}`);
    else report.authUsersDeleted += 1;
  }

  return report;
}
