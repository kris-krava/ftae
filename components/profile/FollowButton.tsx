'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleFollow } from '@/app/_actions/follow';

interface FollowButtonProps {
  targetUserId: string;
  targetUsername: string;
  initialFollowing: boolean;
  isAuthenticated: boolean;
}

export function FollowButton({
  targetUserId,
  targetUsername,
  initialFollowing,
  isAuthenticated,
}: FollowButtonProps) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [, start] = useTransition();

  function onClick() {
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    const next = !following;
    setFollowing(next); // optimistic
    start(async () => {
      const result = await toggleFollow(targetUserId, targetUsername);
      if (!result.ok || result.following !== next) {
        setFollowing((prev) => !prev); // revert
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={following}
      className={
        'rounded-[8px] px-[24px] h-[44px] font-sans font-semibold text-[14px] ' +
        (following
          ? 'bg-surface border border-accent text-accent'
          : 'bg-accent text-surface')
      }
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}
