import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deriveInitials } from '@/lib/initials';
import { MobileNav } from '@/components/MobileNav';
import { MobileBellGate } from '@/components/MobileBellGate';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('username, name, avatar_url')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/');

  const { count: unreadCount } = await supabaseAdmin
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  const username = profile.username;
  const displayName = profile.name?.trim() || username;
  const initials = deriveInitials(profile.name, user.email ?? null);
  const unread = unreadCount ?? 0;

  return (
    <>
      <Sidebar
        username={username}
        displayName={displayName}
        initials={initials}
        avatarUrl={profile.avatar_url ?? null}
        unreadCount={unread}
      />
      <MobileBellGate userId={user.id} initialUnread={unread} />
      <div className="min-h-dvh flex flex-col pb-[80px] tab:pb-0 tab:pl-[60px]">{children}</div>
      {modal}
      <MobileNav username={username} initials={initials} avatarUrl={profile.avatar_url ?? null} />
    </>
  );
}
