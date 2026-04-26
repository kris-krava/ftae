import Link from 'next/link';
import { Mail01 } from '@/components/icons';
import { Wordmark } from '@/app/_components/Wordmark';

interface Props {
  searchParams: { email?: string };
}

export default function CheckEmailPage({ searchParams }: Props) {
  const rawEmail = searchParams.email;
  const email = rawEmail ? decodeURIComponent(rawEmail) : null;

  return (
    <main
      className={
        'flex flex-col items-center justify-center text-center w-full min-h-screen bg-canvas ' +
        'px-[32px] py-[40px] ' +
        'tab:px-[120px] ' +
        'desk:px-[320px]'
      }
    >
      <Wordmark variant="short" />
      <Mail01
        aria-hidden="true"
        className={
          'mt-[24px] text-accent ' +
          'w-[64px] h-[64px] ' +
          'tab:mt-[28px] tab:w-[72px] tab:h-[72px] ' +
          'desk:mt-[32px] desk:w-[80px] desk:h-[80px]'
        }
      />
      <h1
        className={
          'font-serif font-bold text-ink ' +
          'mt-[24px] text-[28px] leading-[36px] ' +
          'tab:mt-[28px] tab:text-[34px] tab:leading-[44px] ' +
          'desk:mt-[32px] desk:text-[38px] desk:leading-[50px]'
        }
      >
        Check your email
      </h1>
      <div
        className={
          'font-sans text-muted ' +
          'mt-[14px] text-[15px] leading-[24px] ' +
          'tab:mt-[16px] tab:text-[16px] tab:leading-[26px] ' +
          'desk:mt-[18px] desk:text-[17px] desk:leading-[28px]'
        }
      >
        <p>
          We sent a magic link to{' '}
          {email ? (
            <span className="font-semibold text-ink">{email}</span>
          ) : (
            <span className="font-semibold text-ink">your inbox</span>
          )}
        </p>
        <p>Tap that link to create your profile.</p>
      </div>
      <Link
        href="/"
        className={
          'font-sans text-accent underline ' +
          'mt-[40px] text-[13px] leading-[21px] ' +
          'tab:mt-[44px] tab:text-[14px] tab:leading-[22px] ' +
          'desk:mt-[48px]'
        }
      >
        Wrong email? Go back
      </Link>
    </main>
  );
}
