import Link from 'next/link';
import { SignOutButton } from '@/components/profile/SignOutButton';

interface AccountSectionProps {
  email: string;
}

export function AccountSection({ email }: AccountSectionProps) {
  return (
    <section className="w-full max-w-[326px] mx-auto mt-[16px] flex flex-col items-center gap-[12px]">
      <span aria-hidden className="block w-full h-px bg-muted/20" />
      <h2 className="font-sans font-medium text-[11px] tracking-[1px] text-muted">ACCOUNT</h2>
      <div className="flex items-center justify-center gap-[10px] font-sans text-[13px]">
        <span className="text-ink">{email}</span>
        <span aria-hidden className="text-divider">|</span>
        <Link href="/app/profile/edit-email" className="text-accent">
          Edit Email
        </Link>
      </div>
      <div className="flex items-center justify-center gap-[10px] font-sans text-[13px]">
        <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-accent">
          Terms of Service
        </Link>
        <span aria-hidden className="text-divider">|</span>
        <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-accent">
          Privacy Policy
        </Link>
        <span aria-hidden className="text-divider">|</span>
        <SignOutButton />
      </div>
    </section>
  );
}
