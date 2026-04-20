'use client';

import { usePathname } from 'next/navigation';
import { MobileBell } from '@/components/MobileBell';

// Routes where we deliberately do not render the floating mobile bell.
// The redesigned pages carry their own empty states / content and the bell
// creates a visual collision or redundancy.
const HIDE_ON = ['/app/following', '/app/discover', '/app/notifications'];

interface Props {
  userId: string;
  initialUnread: number;
}

export function MobileBellGate({ userId, initialUnread }: Props) {
  const pathname = usePathname();
  if (pathname && HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }
  return <MobileBell userId={userId} initialUnread={initialUnread} />;
}
