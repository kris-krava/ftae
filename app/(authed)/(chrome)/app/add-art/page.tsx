import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AddArtModal } from './AddArtModal';

// Allow up to 60s for saveStep4Artwork — six photos uploaded sequentially-in-
// parallel to Supabase Storage from a Vercel function can exceed the default
// 15s window on slower uplinks.
export const maxDuration = 60;

export default async function AddArtPage() {
  const supabase = await createClient();
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
