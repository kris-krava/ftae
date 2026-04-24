import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

import { TEST_DOMAIN_MATCH } from './_guard';

export interface CleanupReport {
  authUsersDeleted: number;
  publicRowsDeleted: number;
  storagePrefixesRemoved: number;
  errors: string[];
}

// Walks a bucket path recursively and returns every leaf file path. Storage
// list() returns child entries (folders have no metadata, files have
// metadata.size); remove() does not recurse, so we have to expand folders
// ourselves or nested files leak — which previously left orphaned artwork
// photos behind after a user was wiped.
async function listAllFiles(
  admin: SupabaseClient,
  bucket: string,
  root: string,
): Promise<string[]> {
  const out: string[] = [];
  const queue: string[] = [root];
  while (queue.length > 0) {
    const prefix = queue.shift()!;
    let offset = 0;
    while (true) {
      const { data, error } = await admin.storage
        .from(bucket)
        .list(prefix, { limit: 1000, offset });
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const entry of data) {
        const fullPath = `${prefix}/${entry.name}`;
        if (entry.metadata && typeof entry.metadata.size === 'number') {
          out.push(fullPath);
        } else {
          queue.push(fullPath);
        }
      }
      if (data.length < 1000) break;
      offset += data.length;
    }
  }
  return out;
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
        const paths = await listAllFiles(admin, bucket, u.id);
        if (paths.length > 0) {
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
 * Discovers every test user and deletes them. Safety is enforced by AND-gating
 * the two identifiers: a public.users row is only a deletion candidate when
 * is_test_user = true AND email matches the reserved test domain. Either
 * condition alone is treated as suspect (could be a real user with a misset
 * flag, or a real user whose email accidentally matches the domain) and
 * skipped with a logged warning.
 *
 * Auth-only orphans (no public.users row) are deleted only when the auth
 * email matches the reserved domain — real users always have a public row.
 */
export async function cleanupAllTestUsers(admin: SupabaseClient): Promise<CleanupReport> {
  const report: CleanupReport = {
    authUsersDeleted: 0,
    publicRowsDeleted: 0,
    storagePrefixesRemoved: 0,
    errors: [],
  };

  const collected = new Map<string, { id: string; email?: string }>();

  // Pull every potentially-test row (flag OR domain), then AND-gate on the
  // application side so we can log mismatches rather than silently include
  // them. The set is small (test users only) so a single fetch is fine.
  const { data: candidateRows, error: candidatesErr } = await admin
    .from('users')
    .select('id, email, is_test_user')
    .or(`is_test_user.eq.true,email.like.%@test.ftae.local`);
  if (candidatesErr) {
    report.errors.push(`users candidate lookup: ${candidatesErr.message}`);
  }

  for (const r of candidateRows ?? []) {
    const flagged = r.is_test_user === true;
    const domainMatch = typeof r.email === 'string' && TEST_DOMAIN_MATCH.test(r.email);
    if (flagged && domainMatch) {
      collected.set(r.id, { id: r.id, email: r.email ?? undefined });
    } else {
      // SAFETY SKIP: don't delete a row that's missing one half of the test
      // identity. Surface it so the developer can investigate.
      report.errors.push(
        `safety-skip user ${r.id} (${r.email ?? 'no-email'}): is_test_user=${flagged} domainMatch=${domainMatch}`,
      );
    }
  }

  // Auth-only orphans: a real user always has a corresponding public.users
  // row (created in /auth/callback). If an auth row exists with the reserved
  // domain but no public row, it's a test artifact (interrupted seed, or
  // public row already deleted by a prior pass) and safe to remove.
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) { report.errors.push(`auth.admin.listUsers: ${error.message}`); break; }
    const users = data?.users ?? [];
    for (const u of users) {
      if (!u.email || !TEST_DOMAIN_MATCH.test(u.email)) continue;
      if (collected.has(u.id)) continue;
      // Confirm there's no surviving public row before treating as orphan.
      const { data: row } = await admin
        .from('users')
        .select('id')
        .eq('id', u.id)
        .maybeSingle();
      if (row) continue; // belongs to a public row that failed the AND gate above
      collected.set(u.id, { id: u.id, email: u.email });
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

  // Safety gate: every address must match the reserved test domain. A typo or
  // miswired caller that slips a real email into this list must not be able
  // to wipe that account.
  for (const e of emails) {
    if (!TEST_DOMAIN_MATCH.test(e)) {
      report.errors.push(`safety-refuse cleanupByEmails: ${e} is not a reserved-domain address`);
      return report;
    }
  }

  const lower = emails.map((e) => e.toLowerCase());
  const collected = new Map<string, { id: string; email?: string }>();

  // Look up public rows by email — AND-gate on is_test_user so an accidentally
  // reused address (e.g. a real user who somehow owns a reserved email) is
  // still protected.
  const { data: rows } = await admin
    .from('users')
    .select('id, email, is_test_user')
    .in('email', lower);
  for (const r of rows ?? []) {
    if (r.is_test_user !== true) {
      report.errors.push(
        `safety-skip cleanupByEmails user ${r.id} (${r.email}): is_test_user=${r.is_test_user}`,
      );
      continue;
    }
    collected.set(r.id, { id: r.id, email: r.email });
  }

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
