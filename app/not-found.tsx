import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      className={
        'flex flex-col items-center justify-center text-center w-full min-h-screen bg-canvas ' +
        'px-[32px] py-[88px] ' +
        'tab:px-[120px] ' +
        'desk:px-[320px]'
      }
    >
      <h1
        className={
          'font-serif font-bold text-ink ' +
          'text-[28px] leading-[36px] ' +
          'tab:text-[34px] tab:leading-[44px] ' +
          'desk:text-[38px] desk:leading-[50px]'
        }
      >
        Page not found
      </h1>
      <p
        className={
          'mt-[16px] font-sans text-muted ' +
          'text-[15px] leading-[24px] ' +
          'tab:text-[16px] tab:leading-[26px]'
        }
      >
        The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-[32px] bg-accent text-surface rounded-[8px] h-[48px] px-[24px] flex items-center justify-center font-sans font-semibold text-[16px]"
      >
        Back to home
      </Link>
    </main>
  );
}
