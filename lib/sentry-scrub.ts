import type { ErrorEvent, EventHint } from '@sentry/nextjs';

// Shared beforeSend hook for client / server / edge Sentry inits. Allows the
// pseudonymous user UUID (so we can group errors per user) but strips
// everything else that could carry PII or auth material:
//
//   - request.data        Server Action FormData / JSON bodies (artwork
//                         titles, descriptions, email-change targets, etc.)
//   - request.cookies     Includes Supabase auth cookies + session prefs
//   - cookie / auth /     IP-bearing or credential-bearing request headers
//     x-forwarded-for /
//     x-real-ip
//   - user.email / name / Anything other than `user.id` on the user context
//     username
//   - email-shaped strings Recursively redacted from contexts (where
//     `reportError`'s `extra` lands) and from breadcrumbs / exception
//     messages — defense-in-depth against accidental email leaks via
//     server-side error messages echoed by SDKs (e.g., Resend errors that
//     embed the recipient address).
//
// Stack trace + route + tags are enough to debug. If a missing field becomes
// load-bearing for triage, add it back deliberately rather than loosening the
// blanket scrub.
//
// Transaction events (we sample at 10%) still go through Sentry's default
// scrubbing — sendDefaultPii: false on each init covers IP/header stripping
// for those. Add a separate beforeSendTransaction if a future audit shows
// trace data leaking PII.

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

function redactEmails(input: unknown, depth = 0): unknown {
  if (depth > 6) return input; // bail on very deep structures to avoid pathological inputs
  if (typeof input === 'string') {
    return input.replace(EMAIL_RE, '[redacted-email]');
  }
  if (Array.isArray(input)) {
    return input.map((v) => redactEmails(v, depth + 1));
  }
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      out[k] = redactEmails(v, depth + 1);
    }
    return out;
  }
  return input;
}

export function scrubPii(event: ErrorEvent, _hint: EventHint): ErrorEvent | null {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    if (event.request.headers) {
      delete event.request.headers['cookie'];
      delete event.request.headers['Cookie'];
      delete event.request.headers['authorization'];
      delete event.request.headers['Authorization'];
      delete event.request.headers['x-forwarded-for'];
      delete event.request.headers['X-Forwarded-For'];
      delete event.request.headers['x-real-ip'];
      delete event.request.headers['X-Real-Ip'];
    }
  }
  if (event.user) {
    event.user = event.user.id ? { id: event.user.id } : {};
  }
  if (event.contexts) {
    event.contexts = redactEmails(event.contexts) as typeof event.contexts;
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b) => ({
      ...b,
      message: typeof b.message === 'string' ? redactEmails(b.message) as string : b.message,
      data: b.data ? (redactEmails(b.data) as typeof b.data) : b.data,
    }));
  }
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((v) => ({
      ...v,
      value: typeof v.value === 'string' ? redactEmails(v.value) as string : v.value,
    }));
  }
  if (typeof event.message === 'string') {
    event.message = redactEmails(event.message) as string;
  }
  return event;
}
