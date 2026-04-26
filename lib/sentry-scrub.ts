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
//
// Stack trace + route + tags are enough to debug. If a missing field becomes
// load-bearing for triage, add it back deliberately rather than loosening the
// blanket scrub.
//
// Transaction events (we sample at 10%) still go through Sentry's default
// scrubbing — sendDefaultPii: false on each init covers IP/header stripping
// for those. Add a separate beforeSendTransaction if a future audit shows
// trace data leaking PII.
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
  return event;
}
