import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isReservedUsername } from '@/lib/username-rules';
import { deriveInitials } from '@/lib/initials';
import {
  getUserByUsername,
  getUserMediums,
  getUserArtworks,
  isFollowing,
} from '@/app/_lib/profile';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ArtworkGrid } from '@/components/profile/ArtworkGrid';
import { AccountSection } from '@/components/profile/AccountSection';
import { FollowButton } from '@/components/profile/FollowButton';
import { BackButton } from '@/components/profile/BackButton';
import { MobileNav } from '@/components/MobileNav';
import { Sidebar } from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

interface ProfilePageProps {
  params: { username: string };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  noStore();
  const username = params.username.toLowerCase();
  if (isReservedUsername(username)) notFound();

  const profileUser = await getUserByUsername(username);
  if (!profileUser) notFound();

  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const isOwner = Boolean(authUser && authUser.id === profileUser.id);

  const [mediums, artworks, viewerProfile, alreadyFollowing, viewerUnread] = await Promise.all([
    getUserMediums(profileUser.id),
    getUserArtworks(profileUser.id),
    authUser
      ? supabaseAdmin
          .from('users')
          .select('username, name, avatar_url')
          .eq('id', authUser.id)
          .single()
          .then((r) => r.data)
      : Promise.resolve(null),
    !isOwner && authUser ? isFollowing(authUser.id, profileUser.id) : Promise.resolve(false),
    authUser
      ? supabaseAdmin
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id)
          .eq('is_read', false)
          .then((r) => r.count ?? 0)
      : Promise.resolve(0),
  ]);

  const renderNav = Boolean(authUser && viewerProfile);

  return (
    <>
      {renderNav && viewerProfile && authUser && (
        <>
          <Sidebar
            username={viewerProfile.username as string}
            displayName={(viewerProfile.name as string)?.trim() || (viewerProfile.username as string)}
            initials={deriveInitials(viewerProfile.name as string | null, authUser.email ?? null)}
            avatarUrl={(viewerProfile.avatar_url as string | null) ?? null}
            unreadCount={viewerUnread}
          />
          <MobileNav
            username={viewerProfile.username as string}
            initials={deriveInitials(viewerProfile.name as string | null, authUser.email ?? null)}
            avatarUrl={(viewerProfile.avatar_url as string | null) ?? null}
            userId={authUser.id}
            initialUnread={viewerUnread}
          />
        </>
      )}

      <main
        className={
          'bg-canvas min-h-screen w-full flex flex-col items-center ' +
          'pt-[32px] ' +
          (renderNav ? 'pb-[96px] tab:pb-[24px] tab:pl-[60px] desk:pl-[60px]' : 'pb-[24px]')
        }
      >
        <section className="w-full flex flex-col items-center px-[32px] tab:px-[40px] desk:px-[80px]">
          <div className="w-full max-w-[326px] tab:max-w-[480px] desk:max-w-[580px] flex flex-col items-center relative">
            {!isOwner && (
              <div className="absolute top-[-8px] left-0">
                <BackButton />
              </div>
            )}

            <ProfileHeader
              user={profileUser}
              mediums={mediums}
              editHref={isOwner ? '/app/profile/edit' : undefined}
            />

            {!isOwner && (
              <div className="mt-[24px]">
                <FollowButton
                  targetUserId={profileUser.id}
                  targetUsername={profileUser.username}
                  initialFollowing={alreadyFollowing}
                  isAuthenticated={Boolean(authUser)}
                />
              </div>
            )}

            <span aria-hidden className="block w-full h-px bg-divider/60 mt-[18px]" />
          </div>
        </section>

        <section className="w-full mt-[14px]">
          <ArtworkGrid
            artworks={artworks}
            artistUsername={profileUser.username}
            showAddTile={isOwner}
            viewerOwnsArt={isOwner}
          />
        </section>

        {isOwner && (
          <section className="w-full flex flex-col items-center px-[32px] tab:px-[40px] desk:px-[80px]">
            <div className="w-full max-w-[326px] tab:max-w-[480px] desk:max-w-[580px]">
              <AccountSection email={profileUser.email} />
            </div>
          </section>
        )}
      </main>
    </>
  );
}

export async function generateMetadata({ params }: ProfilePageProps) {
  const username = params.username.toLowerCase();
  if (isReservedUsername(username)) return {};
  const user = await getUserByUsername(username);
  if (!user) return {};
  const displayName = user.name?.trim() || user.username;
  return { title: `${displayName} · FTAE` };
}
