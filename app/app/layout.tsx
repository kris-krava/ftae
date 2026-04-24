import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deriveInitials } from '@/lib/initials';
import { MobileNav } from '@/components/MobileNav';
import { Sidebar } from '@/components/Sidebar';

// Routes that hide the global nav and render as a full takeover.
// Middleware sets x-pathname so this Server Component can branch on the path.
const TAKEOVER_PREFIXES = [
  '/app/profile/edit-email',
  '/app/profile/edit-username',
  '/app/profile/reauthenticate',
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
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

  const path = headers().get('x-pathname') ?? '';
  const isTakeover = TAKEOVER_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
  if (isTakeover) {
    return <>{children}</>;
  }

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
      />
      <div className="min-h-dvh flex flex-col pb-[96px] tab:pb-0 tab:pl-[60px]">{children}</div>
      <MobileNav
        username={username}
        initials={initials}
        avatarUrl={profile.avatar_url ?? null}
        userId={user.id}
        initialUnread={unread}
      />
    </>
  );
}
