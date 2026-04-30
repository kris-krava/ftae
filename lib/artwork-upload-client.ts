// Client-side helper for direct-to-Storage uploads. Uses XHR (not fetch) so
// we can report upload progress to the user — fetch has no equivalent of
// xhr.upload.onprogress in browsers as of 2026-04. Each PUT goes straight
// to Supabase Storage, bypassing Vercel's 4.5 MB function-body cap.

export interface UploadProgress {
  /** Server-assigned index in the original payload, kept stable so callers
   *  can correlate progress events back to a specific tile. */
  index: number;
  /** Bytes uploaded so far for this single file. */
  loaded: number;
  /** Total bytes for this file. */
  total: number;
}

export interface UploadOptions {
  signal?: AbortSignal;
  onProgress?: (p: UploadProgress) => void;
}

export class UploadError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly index: number,
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/** PUTs `file` to the Supabase signed-upload URL. Resolves on 200/2xx,
 *  rejects with `UploadError` on transport failure or non-2xx status. */
export function uploadFileToSignedUrl(
  file: Blob,
  signedUrl: string,
  index: number,
  contentType: string,
  options: UploadOptions = {},
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl, true);
    xhr.setRequestHeader('Content-Type', contentType);
    // Long upload window: at slow 3G a 5 MB file can need >60s. Don't let
    // the browser kill the connection prematurely.
    xhr.timeout = 5 * 60 * 1000;

    if (options.onProgress) {
      xhr.upload.addEventListener('progress', (evt) => {
        if (evt.lengthComputable) {
          options.onProgress!({ index, loaded: evt.loaded, total: evt.total });
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        // Pin progress at 100% on success so the UI isn't stranded at 99%.
        if (options.onProgress) {
          options.onProgress({ index, loaded: file.size, total: file.size });
        }
        resolve();
      } else {
        reject(new UploadError(`Upload failed (${xhr.status})`, xhr.status, index));
      }
    });
    xhr.addEventListener('error', () => {
      reject(new UploadError('Upload network error', 0, index));
    });
    xhr.addEventListener('timeout', () => {
      reject(new UploadError('Upload timed out', 0, index));
    });
    xhr.addEventListener('abort', () => {
      reject(new UploadError('Upload cancelled', 0, index));
    });

    if (options.signal) {
      if (options.signal.aborted) {
        xhr.abort();
        return;
      }
      options.signal.addEventListener('abort', () => xhr.abort());
    }

    xhr.send(file);
  });
}

/** Uploads many files in parallel with a concurrency cap, reporting
 *  per-file progress to `onProgress`. Resolves only when all succeed;
 *  rejects on the first failure. */
export async function uploadFilesInParallel(
  items: Array<{ file: Blob; signedUrl: string; index: number; contentType: string }>,
  options: { concurrency?: number; signal?: AbortSignal; onProgress?: (p: UploadProgress) => void } = {},
): Promise<void> {
  const concurrency = Math.max(1, options.concurrency ?? 3);
  let cursor = 0;
  const inflight: Promise<void>[] = [];

  async function runOne(idx: number): Promise<void> {
    const it = items[idx];
    await uploadFileToSignedUrl(it.file, it.signedUrl, it.index, it.contentType, {
      signal: options.signal,
      onProgress: options.onProgress,
    });
  }

  while (cursor < items.length || inflight.length > 0) {
    while (inflight.length < concurrency && cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      const p = runOne(idx).finally(() => {
        const i = inflight.indexOf(p);
        if (i >= 0) inflight.splice(i, 1);
      });
      inflight.push(p);
    }
    if (inflight.length > 0) await Promise.race(inflight);
  }
}
