import { NextResponse } from 'next/server';
import { getLandingStats } from '@/app/_lib/landing-stats';

export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  const stats = await getLandingStats();
  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'no-store, max-age=0, must-revalidate',
    },
  });
}
