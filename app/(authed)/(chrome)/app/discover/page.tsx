import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchArtworksPage } from '@/app/_lib/artworks';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { DiscoverClient } from './DiscoverClient';

export default async function DiscoverPage() {
  const supabase = await createClient();
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

  const initial = await fetchArtworksPage(null, { scope: viewerIsTest ? 'test' : 'real' });

  return (
    <main className="bg-canvas flex-1 w-full">
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
