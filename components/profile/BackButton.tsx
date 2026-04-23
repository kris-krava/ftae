'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from '@/components/icons';

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      aria-label="Back"
      className="fixed top-[16px] left-[16px] z-30 flex items-center justify-center w-[40px] h-[40px] tab:hidden"
    >
      <ChevronLeft className="w-[24px] h-[24px] text-muted" strokeWidth={1.67} />
    </button>
  );
}
