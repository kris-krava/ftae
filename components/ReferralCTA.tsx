'use client';

import { useEffect, useRef, useState } from 'react';
import { XClose } from '@/components/icons';

const COPIED_FEEDBACK_MS = 1800;

interface ReferralCTAProps {
  referralUrl: string;
  onClose?: () => void;
}

export function ReferralCTA({ referralUrl, onClose }: ReferralCTAProps) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  const display = referralUrl.replace(/^https?:\/\//, '');

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = referralUrl;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(ta);
      }
    }
    setCopied(true);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
  };

  return (
    <div className="w-[310px] bg-surface rounded-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] px-[20px] py-[16px] flex flex-col items-center gap-[12px]">
      <div className="flex items-center gap-[12px] w-full">
        <p className="flex-1 min-w-0 font-sans font-medium text-[13px] leading-[20px] text-ink text-center">
          Invite artists to join &amp; earn credits!
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss invite card"
            className="shrink-0 w-[24px] h-[24px] flex items-center justify-center text-muted"
          >
            <XClose className="w-[20px] h-[20px]" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-[8px] w-full">
        <div className="flex-1 min-w-0 h-[40px] rounded-[8px] bg-canvas px-[12px] flex items-center">
          <span className="font-sans text-[13px] leading-[20px] text-muted truncate">
            {display}
          </span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-live="polite"
          className="h-[40px] px-[16px] rounded-[8px] bg-accent text-surface font-sans font-semibold text-[13px] leading-[20px] min-w-[68px]"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <p className="font-sans text-[11px] leading-[16px] text-muted text-center">
        What are credits worth? IDK yet, but earn up to 3 when your friends add their first piece of art!
      </p>
    </div>
  );
}
