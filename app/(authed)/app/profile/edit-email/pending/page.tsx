import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { Wordmark } from '@/app/_components/Wordmark';
import { Mail01 } from '@/components/icons';

const HELP_EMAIL = 'help@freetradeartexchange.com';

// "Halfway There" — the user has confirmed one of the two email-change links
// (Supabase's "Secure email change" needs both old- and new-side confirmations
// to complete). This page tells them to check the other inbox.
//
// Reached from /auth/callback?type=email_change when supabaseAdmin reports
// that auth.users.email_change is still set (i.e. only one side has been
// confirmed). Once both are confirmed, Supabase clears email_change and the
// callback routes to /done instead.
export default async function PendingEmailChangePage() {
  noStore();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  return (
    <main className="bg-canvas min-h-dvh w-full flex flex-col items-center justify-center px-[32px] py-[64px] tab:px-[120px] desk:px-[320px]">
      <Wordmark variant="short" />
      <span aria-hidden className="h-[24px] w-px shrink-0" />
      <Mail01 className="w-[64px] h-[64px] text-accent" strokeWidth={2} />
      <span aria-hidden className="h-[24px] w-px shrink-0" />
      <h1 className="font-serif font-bold text-ink text-[28px] tab:text-[34px] desk:text-[38px] leading-[36px] tab:leading-[44px] desk:leading-[50px] text-center">
        You&rsquo;re halfway there!
      </h1>
      <span aria-hidden className="h-[14px] w-px shrink-0" />
      <p className="font-sans text-muted text-[15px] leading-[24px] text-center max-w-[326px]">
        Click the link in your other email account to complete the change.
      </p>
      <span aria-hidden className="h-[40px] w-px shrink-0" />
      <Link
        href={`mailto:${HELP_EMAIL}`}
        className="font-sans text-accent underline text-[13px]"
      >
        {HELP_EMAIL}
      </Link>
    </main>
  );
}

export function generateMetadata() {
  return { title: 'Confirm email change · FTAE' };
}
