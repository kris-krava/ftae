import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { Wordmark } from '@/app/_components/Wordmark';
import { EditUsernameForm } from './EditUsernameForm';
import { USERNAME_COOLDOWN_MS } from '@/lib/username-cooldown';

export default async function EditUsernamePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const { data: row } = await supabaseAdmin
    .from('users')
    .select('username, username_changed_at')
    .eq('id', user.id)
    .single();
  if (!row) redirect('/');

  const username = row.username as string;
  const changedAt = row.username_changed_at as string | null;
  const cooldownEnd = changedAt
    ? new Date(new Date(changedAt).getTime() + USERNAME_COOLDOWN_MS)
    : null;
  const isLocked = !!cooldownEnd && cooldownEnd.getTime() > Date.now();

  if (isLocked && cooldownEnd) {
    return <LockedView username={username} unlockOn={cooldownEnd} />;
  }

  return (
    <main className="bg-canvas min-h-dvh w-full flex flex-col items-center justify-center px-[32px] py-[64px] tab:px-[120px] desk:px-[320px]">
      <Wordmark variant="short" />
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <EditUsernameForm currentUsername={username} />
    </main>
  );
}

function LockedView({ username, unlockOn }: { username: string; unlockOn: Date }) {
  const dateLabel = unlockOn.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return (
    <main className="bg-canvas min-h-dvh w-full flex flex-col items-center justify-center px-[32px] py-[64px] tab:px-[120px] desk:px-[320px] text-center">
      <Wordmark variant="short" />
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <h1 className="font-serif font-bold text-ink text-[28px] leading-[36px] tab:text-[34px] tab:leading-[44px] desk:text-[38px] desk:leading-[50px]">
        Username Locked
      </h1>
      <span aria-hidden className="h-[24px] w-px shrink-0" />
      <p className="font-sans text-muted text-[15px] leading-[24px] tab:text-[16px] tab:leading-[26px] desk:text-[17px] desk:leading-[28px] max-w-[326px] tab:max-w-[480px] desk:max-w-[640px]">
        You can change your username again on {dateLabel}.
      </p>
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <p className="font-sans font-medium text-ink text-[13px]">Current username</p>
      <span aria-hidden className="h-[4px] w-px shrink-0" />
      <p className="font-sans text-muted/80 text-[15px]">@{username}</p>
      <span aria-hidden className="h-[40px] w-px shrink-0" />
      <Link
        href={`/${username}`}
        className="font-sans text-accent underline text-[13px] leading-[21px]"
      >
        Go back
      </Link>
    </main>
  );
}

export function generateMetadata() {
  return { title: 'Edit username · FTAE' };
}
