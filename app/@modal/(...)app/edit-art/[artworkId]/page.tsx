import { notFound, redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getArtworkDetail } from '@/app/_lib/profile';
import { EditArtModal } from '@/app/app/edit-art/[artworkId]/EditArtModal';

interface Props {
  params: { artworkId: string };
}

// Root-level intercept (`(...)`) so navigation to /app/edit-art/[id] from
// anywhere — Discover, /app/* routes, or /[username] profile pages — renders
// the modal in the root @modal slot, leaving the originating page mounted
// behind it. See app/@modal/(...)app/add-art for the matching pattern.
export default async function EditArtModalIntercept({ params }: Props) {
  noStore();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const artwork = await getArtworkDetail(params.artworkId);
  if (!artwork) notFound();
  if (artwork.user_id !== user.id) notFound();

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/');

  return (
    <ErrorBoundary label="edit-art-overlay">
      <EditArtModal
        mode="overlay"
        artwork={artwork}
        backHref={`/${profile.username as string}`}
      />
    </ErrorBoundary>
  );
}
