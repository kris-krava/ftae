import 'server-only';
import { headers } from 'next/headers';

export async function getReferralUrl(code: string): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}/r/${code}`;
}
