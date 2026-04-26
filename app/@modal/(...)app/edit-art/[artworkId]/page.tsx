import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getArtworkDetail } from '@/app/_lib/profile';
import { EditArtModal } from '@/app/(authed)/(chrome)/app/edit-art/[artworkId]/EditArtModal';

interface Props {
  params: Promise<{ artworkId: string }>;
}

// Root-level intercept (`(...)`) so navigation to /app/edit-art/[id] from
// anywhere — Discover, /app/* routes, or /[username] profile pages — renders
// the modal in the root @modal slot, leaving the originating page mounted
// behind it. See app/@modal/(...)app/add-art for the matching pattern.
//
// When the artwork is missing or not owned by the viewer we return null
// instead of calling notFound(): after a successful Delete, softDeleteArtwork
// calls revalidatePath, which causes Next.js to re-render the current page
// tree (including this intercept). At that moment the artwork is gone, so
// notFound() would bubble through the parallel @modal slot up to the root
// not-found page and flash a full-screen 404 before our delete handler's
// router.back() lands. Returning null leaves the modal slot empty during
// that brief transitional re-render. Bad-id direct hits are still 404'd by
// the standalone page at app/(authed)/(chrome)/app/edit-art/[artworkId]/page.tsx.
export default async function EditArtModalIntercept(props: Props) {
  const params = await props.params;
  noStore();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const artwork = await getArtworkDetail(params.artworkId);
  if (!artwork) return null;
  if (artwork.user_id !== user.id) return null;

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
