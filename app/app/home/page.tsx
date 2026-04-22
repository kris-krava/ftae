import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Home01 } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  return (
    <main className="bg-canvas flex-1 w-full flex flex-col items-center justify-center px-[32px]">
      <div className="flex items-center justify-center w-[96px] h-[96px] rounded-full bg-accent/10">
        <Home01 className="w-[48px] h-[48px] text-accent" />
      </div>
      <h1 className="font-serif font-bold text-ink text-center text-[24px] mt-[24px]">
        Your Home Feed
      </h1>
      <p className="font-sans text-muted text-center text-[15px] leading-[24px] mt-[12px]">
        See new work from artists you follow
      </p>
      <Link
        href="/app/discover"
        className="mt-[24px] inline-flex items-center justify-center rounded-[8px] bg-accent px-[24px] h-[48px] font-sans font-semibold text-[16px] leading-[24px] text-surface"
      >
        Discover Artists
      </Link>
    </main>
  );
}
