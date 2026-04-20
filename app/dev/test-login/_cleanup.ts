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
 * Deletes the specified users fully: auth row + public row (cascades to child
 * tables via FK on delete cascade) + owned storage objects.
 * Safe to call with ids that don't exist — missing rows are ignored.
 */
export async function deleteUsersById(
  admin: SupabaseClient,
  users: { id: string; email?: string }[],
  report: CleanupReport,
): Promise<void> {
  for (const u of users) {
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

    const { error: pubErr } = await admin.from('users').delete().eq('id', u.id);
    if (pubErr && !/no rows/i.test(pubErr.message)) {
      report.errors.push(`users delete ${u.id}: ${pubErr.message}`);
    } else {
      report.publicRowsDeleted += 1;
    }

    const { error: authErr } = await admin.auth.admin.deleteUser(u.id);
    if (authErr && !/not found/i.test(authErr.message)) {
      report.errors.push(`auth.admin.deleteUser ${u.id}: ${authErr.message}`);
    } else {
      report.authUsersDeleted += 1;
    }
  }
}

/**
 * Discovers every test user (auth + orphaned public rows) and deletes them.
 * Identifies primarily via users.is_test_user = true, with email-domain
 * fallback for pre-migration rows or auth-only leftovers.
 */
export async function cleanupAllTestUsers(admin: SupabaseClient): Promise<CleanupReport> {
  const report: CleanupReport = {
    authUsersDeleted: 0,
    publicRowsDeleted: 0,
    storagePrefixesRemoved: 0,
    errors: [],
  };

  const collected = new Map<string, { id: string; email?: string }>();

  // Primary: public.users rows marked as test users.
  const { data: flaggedRows, error: flaggedErr } = await admin
    .from('users')
    .select('id, email')
    .eq('is_test_user', true);
  if (flaggedErr) report.errors.push(`users flagged lookup: ${flaggedErr.message}`);
  for (const r of flaggedRows ?? []) {
    collected.set(r.id, { id: r.id, email: r.email });
  }

  // Fallback 1: public.users rows with the test email domain (in case the
  // flag was missed for any reason).
  const { data: orphanRows } = await admin
    .from('users')
    .select('id, email')
    .like('email', '%@test.ftae.local');
  for (const r of orphanRows ?? []) {
    collected.set(r.id, { id: r.id, email: r.email });
  }

  // Fallback 2: auth.users entries with a test email (catches rows where the
  // public row was already deleted but the auth row survived).
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) { report.errors.push(`auth.admin.listUsers: ${error.message}`); break; }
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email && TEST_DOMAIN_MATCH.test(u.email)) {
        if (!collected.has(u.id)) collected.set(u.id, { id: u.id, email: u.email });
      }
    }
    if (users.length < perPage) break;
    page += 1;
  }

  await deleteUsersById(admin, Array.from(collected.values()), report);
  return report;
}

/**
 * Deletes any test user(s) whose email matches one of the supplied addresses.
 * Used by runScenarioAction to wipe the prior state before re-seeding.
 */
export async function cleanupByEmails(
  admin: SupabaseClient,
  emails: string[],
): Promise<CleanupReport> {
  const report: CleanupReport = {
    authUsersDeleted: 0,
    publicRowsDeleted: 0,
    storagePrefixesRemoved: 0,
    errors: [],
  };
  if (emails.length === 0) return report;

  const lower = emails.map((e) => e.toLowerCase());
  const collected = new Map<string, { id: string; email?: string }>();

  // Look up public rows by email.
  const { data: rows } = await admin
    .from('users')
    .select('id, email')
    .in('email', lower);
  for (const r of rows ?? []) collected.set(r.id, { id: r.id, email: r.email });

  // Look up auth rows by email.
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) { report.errors.push(`auth.admin.listUsers: ${error.message}`); break; }
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email && lower.includes(u.email.toLowerCase())) {
        if (!collected.has(u.id)) collected.set(u.id, { id: u.id, email: u.email });
      }
    }
    if (users.length < perPage) break;
    page += 1;
  }

  await deleteUsersById(admin, Array.from(collected.values()), report);
  return report;
}
