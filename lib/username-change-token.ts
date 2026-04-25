import { createHmac, timingSafeEqual } from 'crypto';

// Stateless HMAC-signed token for username-change confirmation links.
//
// Why not use Supabase's signInWithOtp like before? Supabase only exposes the
// six fixed email templates (Magic Link, Confirm Signup, Change Email,
// Reauthentication, Reset Password, Invite User). signInWithOtp fires the
// "Magic Link" template, whose copy reads "Welcome back / sign in" — exactly
// the wrong action label for a username change. We bypass Supabase Auth here
// so we can send a custom Resend email with copy that matches the action.
//
// Mirrors the HMAC-cookie pattern in lib/auth-cookies.ts: HMAC-SHA256 with
// SUPABASE_SERVICE_ROLE_KEY as the secret, base64url payload + signature
// joined by a dot. Stateless — no DB row needed; verify checks signature
// and exp. The route handler also re-validates the candidate username at
// click time so a concurrent rename or cooldown still wins.

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour, matches a typical magic link

interface TokenPayload {
  uid: string;
  username: string;
  exp: number; // unix seconds
}

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for username-change tokens');
  return secret;
}

function sign(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifySignature(token: string): TokenPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', getSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as TokenPayload;
  } catch {
    return null;
  }
}

export function issueUsernameChangeToken(userId: string, newUsername: string): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return sign({ uid: userId, username: newUsername, exp });
}

export function verifyUsernameChangeToken(
  token: string,
): { uid: string; username: string } | null {
  const payload = verifySignature(token);
  if (!payload) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return { uid: payload.uid, username: payload.username };
}
