// TEMPORARY — used once to verify Sentry wiring (DSN, source maps, Slack
// alert, PII scrubbing). Remove this file as soon as the round-trip is
// confirmed in Sentry. The throw path runs through the auto-instrumented
// route handler so it exercises the same capture path real errors use.
export function GET() {
  throw new Error('Sentry verification: deliberate test error from /api/sentry-test');
}
