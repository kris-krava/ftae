import { notFound } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isReservedUsername } from '@/lib/username-rules';
import {
  getUserByUsername,
  getUserMediums,
  getUserArtworks,
  isFollowing,
} from '@/app/_lib/profile';
import { bookmarkedSet } from '@/app/_lib/bookmarks';
import { getMediums, getUserMediumIds } from '@/app/_lib/onboarding';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ArtworkGrid } from '@/components/profile/ArtworkGrid';
import { AccountSection } from '@/components/profile/AccountSection';
import { FollowButton } from '@/components/profile/FollowButton';
import { BackButton } from '@/components/profile/BackButton';
import { EditProfileButton } from '@/components/profile/EditProfileButton';

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export default async function ProfilePage(props: ProfilePageProps) {
  const params = await props.params;
  noStore();
  const username = params.username.toLowerCase();
  if (isReservedUsername(username)) notFound();

  const profileUser = await getUserByUsername(username);
  if (!profileUser) notFound();

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  // Auth is enforced by middleware + (authed)/layout.tsx; this is a typing backstop.
  if (!authUser) notFound();

  const isOwner = authUser.id === profileUser.id;

  const [mediums, artworks, alreadyFollowing, allMediums, ownerMediumIds] = await Promise.all([
    getUserMediums(profileUser.id),
    getUserArtworks(profileUser.id),
    !isOwner ? isFollowing(authUser.id, profileUser.id) : Promise.resolve(false),
    isOwner ? getMediums() : Promise.resolve([]),
    isOwner ? getUserMediumIds(profileUser.id) : Promise.resolve([]),
  ]);

  const bookmarkedIds = !isOwner
    ? await bookmarkedSet(authUser.id, artworks.map((a) => a.id))
    : new Set<string>();

  let creditsEarned = 0;
  if (isOwner) {
    const { count } = await supabaseAdmin
      .from('membership_credits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authUser.id)
      .eq('credit_type', 'referral_bonus');
    creditsEarned = count ?? 0;
  }

  return (
    <main
      className={
        'bg-canvas min-h-screen w-full flex flex-col items-center ' +
        'pt-[32px] pb-[96px] tab:pb-[24px] tab:pl-[60px] desk:pl-[60px]'
      }
    >
      <section className="w-full flex flex-col items-center px-[32px] tab:px-[40px] desk:px-[80px]">
        <div className="w-full max-w-[326px] tab:max-w-[480px] desk:max-w-[580px] flex flex-col items-center relative">
          {!isOwner && <BackButton />}

          <ProfileHeader
            user={profileUser}
            mediums={mediums}
            editButton={
              isOwner ? (
                <EditProfileButton
                  initial={{
                    name: profileUser.name ?? '',
                    location: profileUser.location_city ?? '',
                    avatarUrl: profileUser.avatar_url ?? null,
                    avatarFocalX: profileUser.avatar_focal_x ?? 0.5,
                    avatarFocalY: profileUser.avatar_focal_y ?? 0.5,
                    mediumIds: ownerMediumIds,
                    bio: profileUser.bio ?? '',
                    website: profileUser.website_url ?? '',
                    socialPlatform: profileUser.social_platform ?? '',
                    socialHandle: profileUser.social_handle ?? '',
                  }}
                  mediums={allMediums}
                />
              ) : undefined
            }
            showUsernameEdit={isOwner}
          />

          {!isOwner && (
            <div className="mt-[24px]">
              <FollowButton
                targetUserId={profileUser.id}
                targetUsername={profileUser.username}
                initialFollowing={alreadyFollowing}
                isAuthenticated
              />
            </div>
          )}

          <span aria-hidden className="block w-full h-px bg-divider/60 mt-[18px]" />
        </div>
      </section>

      <section className="w-full mt-[14px]">
        <ArtworkGrid
          artworks={artworks}
          showAddTile={isOwner}
          isAuthenticated
          showBookmarks={!isOwner}
          bookmarkedIds={bookmarkedIds}
        />
      </section>

      {isOwner && (
        <section className="w-full flex flex-col items-center px-[32px] tab:px-[40px] desk:px-[80px]">
          <div className="w-full max-w-[326px] tab:max-w-[480px] desk:max-w-[580px]">
            <AccountSection email={profileUser.email} creditsEarned={creditsEarned} />
          </div>
        </section>
      )}
    </main>
  );
}

export async function generateMetadata(props: ProfilePageProps) {
  const params = await props.params;
  const username = params.username.toLowerCase();
  if (isReservedUsername(username)) return {};
  const user = await getUserByUsername(username);
  if (!user) return {};
  const displayName = user.name?.trim() || user.username;
  return { title: `${displayName} · FTAE` };
}
