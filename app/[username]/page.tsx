import Link from 'next/link';
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
import { Edit02 } from '@/components/icons';
import { MobileNav } from '@/components/MobileNav';
import { MobileBell } from '@/components/MobileBell';
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
          <MobileBell userId={authUser.id} initialUnread={viewerUnread} />
          <MobileNav
            username={viewerProfile.username as string}
            initials={deriveInitials(viewerProfile.name as string | null, authUser.email ?? null)}
            avatarUrl={(viewerProfile.avatar_url as string | null) ?? null}
          />
        </>
      )}

      <main
        className={
          'bg-canvas min-h-screen w-full flex flex-col items-center ' +
          'pt-[68px] px-[32px] tab:px-[40px] desk:px-[80px] ' +
          (renderNav ? 'pb-[80px] tab:pb-[24px] tab:pl-[60px] tab:pr-[40px] desk:pl-[60px] desk:pr-[80px]' : 'pb-[24px]')
        }
      >
        <div className="w-full max-w-[326px] tab:max-w-[480px] desk:max-w-[580px] flex flex-col items-center relative">
          {!isOwner && !renderNav && (
            <div className="absolute top-[-44px] left-0">
              <BackButton />
            </div>
          )}
          {!isOwner && renderNav && (
            <div className="absolute top-[-44px] left-0">
              <BackButton />
            </div>
          )}
          {isOwner && (
            <Link
              href="/app/profile/edit"
              aria-label="Edit profile"
              className="absolute top-[-44px] right-0 flex items-center justify-center w-[40px] h-[40px]"
            >
              <Edit02 className="w-[20px] h-[20px] text-ink" />
            </Link>
          )}

          <ProfileHeader user={profileUser} mediums={mediums} />

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

          <div className="w-full mt-[14px]">
            <ArtworkGrid artworks={artworks} showAddTile={isOwner} />
          </div>

          {isOwner && <AccountSection email={profileUser.email} />}
        </div>
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
