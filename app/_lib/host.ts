import 'server-only';
import { headers, type UnsafeUnwrappedHeaders } from 'next/headers';

export function getOrigin(): string {
  const h = (headers() as unknown as UnsafeUnwrappedHeaders);
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}
