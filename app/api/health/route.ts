import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const revalidate = 0;
export const fetchCache = 'force-no-store';

// Uptime monitoring endpoint. Hits the database with a single cheap query so
// we detect "app is up but DB is down" cases — Vercel's health check only
// proves the function runtime is responding. Use with UptimeRobot /
// BetterStack / Pingdom against the public URL.
export async function GET() {
  const startedAt = Date.now();

  try {
    // mediums is a tiny, append-only seed table — querying it is cheap and
    // proves we have a working DB connection + RLS policies that allow reads.
    const { error } = await supabaseAdmin
      .from('mediums')
      .select('id', { head: true, count: 'exact' })
      .limit(1);

    if (error) {
      return NextResponse.json(
        { status: 'degraded', component: 'database', error: error.message },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    return NextResponse.json(
      { status: 'ok', latency_ms: Date.now() - startedAt },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        status: 'degraded',
        component: 'unknown',
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
