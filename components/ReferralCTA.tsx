'use client';

import { useEffect, useRef, useState } from 'react';

const REFERRAL_LINK = 'ftae.co/invite/jane';
const COPIED_FEEDBACK_MS = 1800;

export function ReferralCTA() {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(REFERRAL_LINK);
    } catch {
      // Older browsers / insecure contexts: fall back to a hidden textarea + execCommand.
      const ta = document.createElement('textarea');
      ta.value = REFERRAL_LINK;
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
      <p className="font-sans text-[13px] leading-[20px] text-ink text-center">
        Invite artists to join &amp; earn referral credits!
      </p>
      <div className="flex items-center gap-[8px] w-full">
        <div className="flex-1 min-w-0 h-[40px] rounded-[8px] bg-canvas px-[12px] flex items-center">
          <span className="font-sans text-[13px] leading-[20px] text-muted truncate">
            {REFERRAL_LINK}
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
