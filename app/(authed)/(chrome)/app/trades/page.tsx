import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getBookmarksGroupedByArtist } from '@/app/_lib/bookmarks';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { TradesClient } from './TradesClient';

export default async function TradesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const groups = await getBookmarksGroupedByArtist(user.id);

  return (
    <ErrorBoundary label="trades">
      <TradesClient initialGroups={groups} />
    </ErrorBoundary>
  );
}
