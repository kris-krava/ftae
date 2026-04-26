import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// Authed root: gates every nested route on a valid session. Chrome rendering
// (Sidebar / MobileNav) lives in the (chrome) child group; takeover routes
// (edit-email, edit-username, reauthenticate) sit in the (takeover) sibling
// group with a bare pass-through layout. This split replaces the earlier
// x-pathname-from-middleware gating, which was fragile across Next.js
// version upgrades.
export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');
  return <>{children}</>;
}
