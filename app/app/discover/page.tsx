import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchArtworksPage } from '@/app/_lib/artworks';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DiscoverClient } from './DiscoverClient';

export const dynamic = 'force-dynamic';

export default async function DiscoverPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: viewer } = await supabaseAdmin
    .from('users')
    .select('is_test_user')
    .eq('id', user.id)
    .single();
  const viewerIsTest = Boolean(viewer?.is_test_user);

  const initial = await fetchArtworksPage(null, { includeTestUsers: viewerIsTest });

  return (
    <main className="bg-canvas min-h-screen w-full">
      <ErrorBoundary label="discover">
        <DiscoverClient
          initialArtworks={initial.items}
          initialCursor={initial.nextCursor}
          isAuthenticated
        />
      </ErrorBoundary>
    </main>
  );
}
