import Link from 'next/link';
import { Wordmark } from '@/app/_components/Wordmark';
import { LandingForm } from '@/app/_components/LandingForm';

interface SignInPageProps {
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

export default function SignInPage({ searchParams }: SignInPageProps) {
  const next = safeNext(searchParams.next);

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

      <p
        className={
          'mt-[32px] font-sans font-semibold text-ink ' +
          'text-[15px] leading-[24px] ' +
          'tab:mt-[36px] tab:text-[16px] tab:leading-[26px] ' +
          'desk:mt-[40px] desk:text-[17px] desk:leading-[28px]'
        }
      >
        Join now and get 3 months free!
      </p>

      <div className="mt-[16px]">
        <LandingForm next={next} checkboxAlign="start" />
      </div>

      <p className="mt-[16px] font-sans text-[13px] leading-[20px] text-muted tab:text-[14px] tab:leading-[22px]">
        I&rsquo;ll send you a magic link &mdash; no password needed.
      </p>

      <Link
        href="mailto:help@freetradeartexchange.com"
        className="mt-[8px] font-sans text-accent text-[15px] leading-[26px] tab:text-[16px] tab:leading-[26px] desk:text-[17px] desk:leading-[28px]"
      >
        help@freetradeartexchange.com
      </Link>

      <Link
        href="/"
        className="mt-[24px] font-sans text-accent underline text-[13px] leading-[21px]"
      >
        Wrong email? Go back
      </Link>
    </main>
  );
}

export function generateMetadata() {
  return { title: 'Sign in or join · FTAE' };
}
