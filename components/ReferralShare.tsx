'use client';

import { useState } from 'react';

interface ReferralShareProps {
  referralUrl: string;
  className?: string;
}

export function ReferralShare({ referralUrl, className }: ReferralShareProps) {
  const [copied, setCopied] = useState(false);
  const display = referralUrl.replace(/^https?:\/\//, '');

  async function onShare() {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'Join me on Free Trade Art Exchange',
          url: referralUrl,
        });
        return;
      } catch {
        // fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op
    }
  }

  return (
    <div className={`flex gap-[8px] items-center ${className ?? ''}`}>
      <div className="flex-1 min-w-0 bg-canvas/70 border border-divider rounded-[8px] h-[40px] px-[11px] flex items-center">
        <span className="font-sans text-[13px] text-muted truncate">{display}</span>
      </div>
      <button
        type="button"
        onClick={onShare}
        className="bg-accent text-surface rounded-[8px] h-[40px] px-[18px] font-sans font-semibold text-[14px]"
      >
        {copied ? 'Copied' : 'Share'}
      </button>
    </div>
  );
}
