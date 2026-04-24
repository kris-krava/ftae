import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AddArtModal } from '@/app/app/add-art/AddArtModal';

// Root-level intercept (`(...)`) so navigation to /app/add-art from anywhere —
// /app/* routes (Home, Discover, Trades, …) AND /[username] profile pages —
// renders the modal in the root @modal slot, leaving the originating page
// mounted behind it. A nested intercept under /app/app/@modal couldn't catch
// navigations originating outside the /app/* layout tree.
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
