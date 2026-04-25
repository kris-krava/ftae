import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { getMediums, getUserMediumIds } from '@/app/_lib/onboarding';
import { EditModal } from './EditModal';

export default async function ProfileEditPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('username, name, location_city, bio, avatar_url, avatar_focal_x, avatar_focal_y, website_url, social_platform, social_handle')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/');

  const [mediums, selectedIds] = await Promise.all([getMediums(), getUserMediumIds(user.id)]);

  return (
    <ErrorBoundary label="profile-edit">
      <EditModal
        backHref={`/${profile.username as string}`}
        initial={{
          name: (profile.name as string | null) ?? '',
          location: (profile.location_city as string | null) ?? '',
          avatarUrl: (profile.avatar_url as string | null) ?? null,
          avatarFocalX: (profile.avatar_focal_x as number | null) ?? 0.5,
          avatarFocalY: (profile.avatar_focal_y as number | null) ?? 0.5,
          mediumIds: selectedIds,
          bio: (profile.bio as string | null) ?? '',
          website: (profile.website_url as string | null) ?? '',
          socialPlatform: (profile.social_platform as string | null) ?? '',
          socialHandle: (profile.social_handle as string | null) ?? '',
        }}
        mediums={mediums}
      />
    </ErrorBoundary>
  );
}
