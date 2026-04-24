// Validate `?next=` query params used to redirect after auth flows. Goal:
// allow only same-origin paths so an attacker can't craft a sign-in link
// that bounces a user out to a phishing site.
//
// Rules:
//   - must start with `/` and not `//` (block protocol-relative)
//   - must not start with `/\` (block Windows-style backslash trick)
//   - must not point at internal auth/api routes (would loop)
//   - must be reasonably short
//   - if URL-encoded, the decoded form must satisfy the same rules so we
//     don't get tricked by `%2F%2Fevil.com` or `%5C` (encoded backslash)

const MAX_LEN = 512;
const FORBIDDEN_PREFIXES = ['/auth/', '/api/'];

function rejects(value: string): boolean {
  if (!value.startsWith('/')) return true;
  if (value.startsWith('//')) return true;
  if (value.startsWith('/\\')) return true;
  if (value.length > MAX_LEN) return true;
  for (const p of FORBIDDEN_PREFIXES) {
    if (value.startsWith(p)) return true;
  }
  return false;
}

export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (rejects(raw)) return null;
  // Re-check the decoded form. If decode throws (malformed %xx), bail.
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded !== raw && rejects(decoded)) return null;
  } catch {
    return null;
  }
  return raw;
}
