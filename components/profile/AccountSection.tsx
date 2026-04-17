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
      <p className="font-sans text-[13px] text-ink text-center">{email}</p>
      <div className="flex items-center gap-[8px] w-full justify-center font-sans text-[13px]">
        <Link href="/app/profile/edit-email" className="text-accent text-right flex-1">
          Edit Email
        </Link>
        <span aria-hidden className="text-muted/50">|</span>
        <SignOutButton />
      </div>
    </section>
  );
}
