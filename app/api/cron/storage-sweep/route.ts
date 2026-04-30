import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { reportError } from '@/lib/observability';

// Daily cleanup of orphaned artwork-photos. The direct-to-Storage upload flow
// has a small failure window: a user can upload all their photos to Storage,
// then close the tab before the metadata commit lands. Without this sweep
// those files would accumulate indefinitely.
//
// Path layout is `userId/artworkId/<random>.<ext>`. A file is an orphan when:
//   - its parent `artworkId` folder has no corresponding row in `artworks`, OR
//   - the file's URL doesn't appear in `artwork_photos` for that artworkId.
// Files less than 24h old are skipped — that's the grace window during which
// a slow user might still hit Save.
//
// Auth: Vercel Cron sets `Authorization: Bearer ${CRON_SECRET}` automatically
// when the env var is set on the project. Reject anything else so the route
// can't be poked from the open internet.

const GRACE_MS = 24 * 60 * 60 * 1000;
const BUCKET = 'artwork-photos';

interface SweepResult {
  scanned: number;
  deleted: number;
  errors: number;
  durationMs: number;
}

export async function GET(request: Request): Promise<NextResponse> {
  const expected = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized.' }, { status: 401 });
  }

  const startedAt = Date.now();
  const result: SweepResult = { scanned: 0, deleted: 0, errors: 0, durationMs: 0 };

  try {
    // Walk the bucket one user folder at a time. Storage list() is shallow
    // (no recursive flag), so we descend manually: bucket → user folders →
    // artwork folders → files.
    const { data: userFolders, error: userListErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .list('', { limit: 1000 });
    if (userListErr) throw userListErr;

    const referencedUrls = new Set<string>();
    const activeArtworkIds = new Set<string>();
    {
      const { data: photos } = await supabaseAdmin
        .from('artwork_photos')
        .select('url, artwork_id');
      for (const row of photos ?? []) {
        if (row.url) referencedUrls.add(row.url as string);
        if (row.artwork_id) activeArtworkIds.add(row.artwork_id as string);
      }
    }

    const orphanPaths: string[] = [];

    for (const userFolder of userFolders ?? []) {
      // Skip non-folders (Supabase returns folders with `id == null` in list).
      if (userFolder.id !== null) continue;

      const { data: artworkFolders, error: artErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .list(userFolder.name, { limit: 1000 });
      if (artErr) {
        result.errors += 1;
        continue;
      }

      for (const artFolder of artworkFolders ?? []) {
        if (artFolder.id !== null) continue;
        const artworkId = artFolder.name;
        const folderPath = `${userFolder.name}/${artworkId}`;

        const { data: files, error: fileErr } = await supabaseAdmin.storage
          .from(BUCKET)
          .list(folderPath, { limit: 1000 });
        if (fileErr) {
          result.errors += 1;
          continue;
        }

        for (const file of files ?? []) {
          if (!file.id) continue; // skip nested folders
          result.scanned += 1;
          const fullPath = `${folderPath}/${file.name}`;
          const createdAt = file.created_at ? new Date(file.created_at).getTime() : 0;
          if (Date.now() - createdAt < GRACE_MS) continue;

          const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fullPath);
          const isReferenced = referencedUrls.has(pub.publicUrl) || activeArtworkIds.has(artworkId);
          if (!isReferenced) orphanPaths.push(fullPath);
        }
      }
    }

    if (orphanPaths.length > 0) {
      // Storage.remove can take many paths in one call. Batch in chunks of 100
      // to keep the request small and to give partial-failure clarity.
      for (let i = 0; i < orphanPaths.length; i += 100) {
        const slice = orphanPaths.slice(i, i + 100);
        const { error: rmErr } = await supabaseAdmin.storage.from(BUCKET).remove(slice);
        if (rmErr) {
          result.errors += slice.length;
          reportError({ area: 'cron', op: 'storage-sweep-remove', err: rmErr, extra: { paths: slice } });
        } else {
          result.deleted += slice.length;
        }
      }
    }
  } catch (err) {
    reportError({ area: 'cron', op: 'storage-sweep', err });
    result.errors += 1;
  }

  result.durationMs = Date.now() - startedAt;
  return NextResponse.json({ ok: true, ...result });
}
