import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

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

export function emptyCleanupReport(): CleanupReport {
  return { authUsersDeleted: 0, publicRowsDeleted: 0, storagePrefixesRemoved: 0, errors: [] };
}
