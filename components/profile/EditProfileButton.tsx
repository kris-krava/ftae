'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Edit05 } from '@/components/icons';
import { EditModal } from '@/components/profile/EditModal';

interface EditProfileButtonProps {
  initial: {
    name: string;
    location: string;
    avatarUrl: string | null;
    avatarFocalX: number;
    avatarFocalY: number;
    mediumIds: string[];
    bio: string;
    website: string;
    socialPlatform: string;
    socialHandle: string;
  };
  mediums: { id: string; name: string }[];
}

/**
 * Renders the Edit Profile pencil button next to the avatar and the modal
 * itself when open. Lives on the user's profile page so the modal overlays
 * the profile content. On close, refreshes the route so any name/avatar/etc.
 * updates from the modal show up immediately on the profile underneath.
 */
export function EditProfileButton({ initial, mediums }: EditProfileButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Edit Profile"
        className="absolute top-[-10px] right-[-12px] w-[40px] h-[40px] flex items-center justify-center"
      >
        <Edit05 className="w-[20px] h-[20px] text-muted" />
      </button>
      {open && (
        <EditModal
          initial={initial}
          mediums={mediums}
          onClose={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
