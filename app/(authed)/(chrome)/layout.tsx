import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deriveInitials } from '@/lib/initials';
import { MobileNav } from '@/components/MobileNav';
import { Sidebar } from '@/components/Sidebar';

export default async function ChromeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('username, name, avatar_url, avatar_focal_x, avatar_focal_y, avatar_aspect_ratio')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/');

  const { count: unreadCount } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  const username = profile.username;
  const initials = deriveInitials(profile.name, user.email ?? null);
  const unread = unreadCount ?? 0;

  return (
    <>
      <Sidebar
        username={username}
        initials={initials}
        avatarUrl={profile.avatar_url ?? null}
        unreadCount={unread}
        avatarFocalX={(profile.avatar_focal_x as number | null) ?? 0.5}
        avatarFocalY={(profile.avatar_focal_y as number | null) ?? 0.5}
        avatarAspectRatio={(profile.avatar_aspect_ratio as number | null) ?? null}
      />
      <div className="min-h-dvh flex flex-col pb-[96px] tab:pb-0 tab:pl-[60px]">{children}</div>
      <MobileNav
        username={username}
        initials={initials}
        avatarUrl={profile.avatar_url ?? null}
        userId={user.id}
        initialUnread={unread}
        avatarFocalX={(profile.avatar_focal_x as number | null) ?? 0.5}
        avatarFocalY={(profile.avatar_focal_y as number | null) ?? 0.5}
        avatarAspectRatio={(profile.avatar_aspect_ratio as number | null) ?? null}
      />
    </>
  );
}
