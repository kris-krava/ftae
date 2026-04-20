import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AddArtModal } from '@/app/app/add-art/AddArtModal';

export const dynamic = 'force-dynamic';

// Intercepting route: when the user clicks an in-app link that points at
// /app/add-art, Next.js renders this component into the @modal parallel
// slot instead of navigating away. The underlying page (Following, Discover,
// profile, etc.) stays mounted behind it.
export default async function AddArtModalIntercept() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/');

  return (
    <ErrorBoundary label="add-art-overlay">
      <AddArtModal mode="overlay" backHref={`/${profile.username as string}`} />
    </ErrorBoundary>
  );
}
