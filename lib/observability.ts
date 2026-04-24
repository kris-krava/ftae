import 'server-only';
import * as Sentry from '@sentry/nextjs';

interface ReportArgs {
  /** Coarse-grained area, e.g. 'auth-callback', 'admin-actions', 'onboarding'. */
  area: string;
  /** Specific operation, e.g. 'username_update', 'photo_upload'. */
  op: string;
  /** The caught error. Supabase returns plain objects, not Error instances. */
  err: unknown;
  /** Attach the acting user when known so Sentry shows it in the issue. */
  userId?: string;
  /** Extra context — Supabase error code/details/hint, args, etc. */
  extra?: Record<string, unknown>;
}

// Reports a non-throwing failure to Sentry while keeping the existing
// console.error behavior (Vercel function logs still show it). Wraps non-Error
// values in Error so Sentry gets a proper stack and groups by message.
//
// Use this for caught errors that don't propagate as exceptions — Supabase
// query errors, fire-and-forget side effects, etc. Sentry's auto-instrumentation
// already captures unhandled exceptions; this fills the gap.
export function reportError({ area, op, err, userId, extra }: ReportArgs): void {
  console.error(`[${area}] ${op}:`, err);

  const message =
    err instanceof Error
      ? err.message
      : (err as { message?: string })?.message ?? String(err);

  const wrapped =
    err instanceof Error ? err : new Error(`${area}/${op}: ${message}`);

  Sentry.captureException(wrapped, {
    tags: { area, op },
    user: userId ? { id: userId } : undefined,
    contexts: extra ? { details: extra } : undefined,
  });
}
