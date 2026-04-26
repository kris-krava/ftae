import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Wordmark } from '@/app/_components/Wordmark';
import { CheckCircle } from '@/components/icons';

export default async function UsernameUpdatedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();
  if (!profile) redirect('/');

  const username = profile.username as string;
  return (
    <main className="bg-canvas min-h-dvh w-full flex flex-col items-center justify-center px-[32px] tab:px-[120px] desk:px-[320px] text-center">
      <Wordmark variant="short" />
      <span aria-hidden className="h-[24px] tab:h-[28px] desk:h-[32px] w-px shrink-0" />
      <CheckCircle
        className="w-[64px] h-[64px] tab:w-[72px] tab:h-[72px] desk:w-[80px] desk:h-[80px] text-accent"
        strokeWidth={2}
      />
      <span aria-hidden className="h-[24px] tab:h-[28px] desk:h-[32px] w-px shrink-0" />
      <h1 className="font-serif font-bold text-ink text-[28px] leading-[36px] tab:text-[34px] tab:leading-[44px] desk:text-[38px] desk:leading-[50px]">
        Username updated
      </h1>
      <span aria-hidden className="h-[14px] tab:h-[16px] desk:h-[18px] w-px shrink-0" />
      <p className="font-sans text-muted text-[15px] leading-[24px] tab:text-[16px] tab:leading-[26px] desk:text-[17px] desk:leading-[28px] max-w-[326px] tab:max-w-[480px] desk:max-w-[640px]">
        Your profile now lives at{' '}
        <span className="font-semibold text-ink">freetradeartexchange.com/{username}</span>.
      </p>
      <span aria-hidden className="h-[40px] tab:h-[44px] desk:h-[48px] w-px shrink-0" />
      <Link
        href={`/${username}`}
        className="bg-accent text-surface rounded-[8px] h-[48px] desk:h-[52px] px-[16px] desk:w-[352px] flex items-center justify-center font-sans font-semibold text-[16px]"
      >
        Back to Profile
      </Link>
    </main>
  );
}

export function generateMetadata() {
  return { title: 'Username updated · FTAE' };
}
