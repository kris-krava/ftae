import { notFound, redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getArtworkDetail } from '@/app/_lib/profile';
import { EditArtModal } from './EditArtModal';

interface Props {
  params: Promise<{ artworkId: string }>;
}

export default async function EditArtPage(props: Props) {
  const params = await props.params;
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
    <ErrorBoundary label="edit-art">
      <EditArtModal
        artwork={artwork}
        backHref={`/${profile.username as string}`}
      />
    </ErrorBoundary>
  );
}
