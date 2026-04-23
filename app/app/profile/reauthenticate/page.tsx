import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Wordmark } from '@/app/_components/Wordmark';
import { ReauthForm } from './ReauthForm';

export const dynamic = 'force-dynamic';

interface ReauthPageProps {
  searchParams: { next?: string };
}

function safeNext(raw: string | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  if (raw.startsWith('/auth/')) return null;
  if (raw.startsWith('/api/')) return null;
  if (raw.length > 512) return null;
  return raw;
}

export default async function ReauthPage({ searchParams }: ReauthPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) redirect('/sign-in');

  const next = safeNext(searchParams.next) ?? '/app/home';

  return (
    <main
      className={
        'flex flex-col items-center text-center w-full min-h-full bg-canvas ' +
        'px-[32px] py-[88px] ' +
        'tab:px-[120px] tab:py-[100px] ' +
        'desk:px-[320px] desk:py-[120px]'
      }
    >
      <Wordmark variant="full" />
      <ReauthForm currentEmail={user.email} next={next} />
    </main>
  );
}

export function generateMetadata() {
  return { title: 'Confirm it’s you · FTAE' };
}
