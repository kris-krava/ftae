import { NextResponse, type NextRequest } from 'next/server';
import { notFound } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { DEV_TOOLS_ENABLED, assertDev, assertNotProdHost } from '../_guard';

const CODE_PATTERN = /^[A-Za-z0-9._~-]{8,256}$/;
const SAFE_NEXT = /^\/[A-Za-z0-9/_\-.?=&]*$/;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!DEV_TOOLS_ENABLED) notFound();
  assertDev();
  assertNotProdHost(request.headers.get('host'));

  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const nextParam = searchParams.get('next') ?? '/app/following';

  if (!code || !CODE_PATTERN.test(code)) {
    return NextResponse.redirect(`${origin}/?error=invalid_code`);
  }
  const next = SAFE_NEXT.test(nextParam) ? nextParam : '/app/following';

  const supabase = createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/?error=auth_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
