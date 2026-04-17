import Link from 'next/link';
import { Wordmark } from '@/app/_components/Wordmark';

export default function UsernameNotFound() {
  return (
    <main className="bg-canvas min-h-screen w-full flex flex-col items-center justify-center px-[32px] py-[64px] text-center">
      <Wordmark variant="short" />
      <span aria-hidden className="h-[24px] w-px shrink-0" />
      <h1 className="font-serif font-bold text-ink text-[28px] leading-[36px] tab:text-[34px] tab:leading-[44px] desk:text-[38px] desk:leading-[50px]">
        Artist not found
      </h1>
      <span aria-hidden className="h-[14px] w-px shrink-0" />
      <p className="font-sans text-muted text-[15px] leading-[24px] max-w-[326px]">
        We couldn&rsquo;t find a profile with that username.
      </p>
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <Link
        href="/"
        className="font-sans text-accent text-[13px] underline"
      >
        Back home
      </Link>
    </main>
  );
}
