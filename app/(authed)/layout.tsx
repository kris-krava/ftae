import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deriveInitials } from '@/lib/initials';
import { MobileNav } from '@/components/MobileNav';
import { Sidebar } from '@/components/Sidebar';

// Force per-request rendering. The layout reads `x-pathname` from headers()
// to decide whether to render the chrome or pass through as a full-screen
// takeover; without force-dynamic, Next.js's auto-detection has historically
// missed the headers() signal in production builds and served the layout
// stale, causing the chrome to leak onto takeover routes (edit-email,
// edit-username, reauthenticate).
export const dynamic = 'force-dynamic';

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

  const path = (await headers()).get('x-pathname') ?? '';
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
