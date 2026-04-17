import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AddArtModal } from './AddArtModal';

export const dynamic = 'force-dynamic';

export default async function AddArtPage() {
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
    <ErrorBoundary label="add-art">
      <AddArtModal backHref={`/${profile.username as string}`} />
    </ErrorBoundary>
  );
}
