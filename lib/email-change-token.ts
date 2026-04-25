import { createHmac, timingSafeEqual } from 'crypto';

// Stateless HMAC-signed token for email-change confirmation links. Mirrors
// the pattern in lib/username-change-token.ts and lib/auth-cookies.ts.
//
// Two tokens per change — one for `side: 'old'` (sent to the current address),
// one for `side: 'new'` (sent to the prospective address). Each click marks
// the corresponding side confirmed in the pending_email_changes row; once
// both sides are non-null the route handler applies the change.

const TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

interface TokenPayload {
  uid: string;
  side: 'old' | 'new';
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for email-change tokens');
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

export function issueEmailChangeToken(userId: string, side: 'old' | 'new'): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  return sign({ uid: userId, side, exp });
}

export function verifyEmailChangeToken(
  token: string,
): { uid: string; side: 'old' | 'new' } | null {
  const payload = verifySignature(token);
  if (!payload) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  if (payload.side !== 'old' && payload.side !== 'new') return null;
  return { uid: payload.uid, side: payload.side };
}

export const EMAIL_CHANGE_TOKEN_TTL_SECONDS = TOKEN_TTL_SECONDS;
