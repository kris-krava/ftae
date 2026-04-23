// Username rules:
//   - lowercase letters, digits, periods, underscores, hyphens
//   - 3 to 30 chars
//   - cannot start or end with a special character
//   - no consecutive special characters
//
// `validateUsername` is the gate; `sanitizeUsernameMirror` derives a candidate
// username from the display name as the user types in onboarding. Sanitization
// silently drops disallowed characters and collapses runs of specials so the
// auto-mirrored value is always valid (or empty).

export const USERNAME_MIN_LEN = 3;
export const USERNAME_MAX_LEN = 30;

export type UsernameValidation =
  | { ok: true }
  | { ok: false; reason: string };

const ALLOWED_CHAR = /^[a-z0-9._-]+$/;
const SPECIAL = /[._-]/;
const CONSECUTIVE_SPECIALS = /[._-]{2,}/;

export function validateUsername(raw: string): UsernameValidation {
  if (raw.length < USERNAME_MIN_LEN) {
    return { ok: false, reason: `Username must be at least ${USERNAME_MIN_LEN} characters.` };
  }
  if (raw.length > USERNAME_MAX_LEN) {
    return { ok: false, reason: `Username must be ${USERNAME_MAX_LEN} characters or fewer.` };
  }
  if (!ALLOWED_CHAR.test(raw)) {
    return { ok: false, reason: 'Use lowercase letters, numbers, periods, underscores, or hyphens.' };
  }
  if (SPECIAL.test(raw[0])) {
    return { ok: false, reason: 'Username cannot start with a period, underscore, or hyphen.' };
  }
  if (SPECIAL.test(raw[raw.length - 1])) {
    return { ok: false, reason: 'Username cannot end with a period, underscore, or hyphen.' };
  }
  if (CONSECUTIVE_SPECIALS.test(raw)) {
    return { ok: false, reason: 'No two special characters in a row.' };
  }
  return { ok: true };
}

// Live input filter for the username field — applied as the user types so
// disallowed characters never appear in state. Less aggressive than the
// mirror function: leaves leading/trailing/consecutive specials alone so the
// user can finish typing; final correctness is enforced by `validateUsername`
// on submit.
export function liveSanitizeUsernameInput(raw: string): string {
  let s = raw.toLowerCase();
  s = s.replace(/^@+/, '');
  s = s.replace(/\s+/g, '.');
  s = s.replace(/[^a-z0-9._-]/g, '');
  if (s.length > USERNAME_MAX_LEN) s = s.slice(0, USERNAME_MAX_LEN);
  return s;
}

export function sanitizeUsernameMirror(displayName: string): string {
  let s = displayName.toLowerCase();
  s = s.replace(/\s+/g, '.');
  s = s.replace(/[^a-z0-9._-]/g, '');
  s = s.replace(/([._-])[._-]+/g, '$1');
  s = s.replace(/^[._-]+/, '');
  if (s.length > USERNAME_MAX_LEN) s = s.slice(0, USERNAME_MAX_LEN);
  s = s.replace(/[._-]+$/, '');
  return s;
}
