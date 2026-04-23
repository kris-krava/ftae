import { createHmac, timingSafeEqual } from 'crypto';

// Signed-cookie helpers for the re-authentication window.
// HMAC-SHA256 with SUPABASE_SERVICE_ROLE_KEY as the secret. The cookie attests
// "this user re-confirmed inbox access in the last N minutes" and gates the
// few sensitive actions (currently email change). It does not grant access on
// its own — a valid Supabase session is still required.

export const REAUTH_COOKIE = 'ftae_reauth';
export const REAUTH_WINDOW_SECONDS = 60 * 10; // 10 minutes

interface ReauthPayload {
  uid: string;
  exp: number; // unix seconds
}

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for reauth cookies');
  return secret;
}

function sign(payload: ReauthPayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const sig = createHmac('sha256', getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verify(token: string): ReauthPayload | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', getSecret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as ReauthPayload;
  } catch {
    return null;
  }
}

export function issueReauthToken(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + REAUTH_WINDOW_SECONDS;
  return sign({ uid: userId, exp });
}

export function isReauthFresh(token: string | undefined, userId: string): boolean {
  if (!token) return false;
  const payload = verify(token);
  if (!payload) return false;
  if (payload.uid !== userId) return false;
  return payload.exp > Math.floor(Date.now() / 1000);
}
