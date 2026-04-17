'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface SuccessTransitionProps {
  delayMs: number;
  target: string;
}

export function SuccessTransition({ delayMs, target }: SuccessTransitionProps) {
  const router = useRouter();
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(target);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [delayMs, target, router]);
  return null;
}
