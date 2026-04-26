'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { saveStep2Mediums, saveStep2Bio } from '@/app/_actions/onboarding';

interface Step2FormProps {
  mediums: { id: string; name: string }[];
  initialSelectedIds: string[];
  initialBio: string;
}

const SAVE_DEBOUNCE_MS = 500;
const MAX_BIO = 160;

export function Step2Form({ mediums, initialSelectedIds, initialBio }: Step2FormProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelectedIds));
  const [bio, setBio] = useState(initialBio);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [continuePending, startContinue] = useTransition();

  const mediumDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bioDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialMount = useRef(true);

  useEffect(() => {
    if (initialMount.current) return;
    if (mediumDebounce.current) clearTimeout(mediumDebounce.current);
    mediumDebounce.current = setTimeout(() => {
      const ids = Array.from(selected);
      startTransition(async () => {
        const result = await saveStep2Mediums(ids);
        if (!result.ok) setError(result.error);
        else setError(null);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (mediumDebounce.current) clearTimeout(mediumDebounce.current);
    };
  }, [selected]);

  useEffect(() => {
    if (initialMount.current) return;
    if (bioDebounce.current) clearTimeout(bioDebounce.current);
    bioDebounce.current = setTimeout(() => {
      startTransition(async () => {
        const result = await saveStep2Bio(bio);
        if (!result.ok) setError(result.error);
        else setError(null);
      });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (bioDebounce.current) clearTimeout(bioDebounce.current);
    };
  }, [bio]);

  useEffect(() => {
    initialMount.current = false;
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onContinue() {
    setError(null);
    if (selected.size === 0) {
      setError('Please select at least one medium.');
      return;
    }
    if (!bio.trim()) {
      setError('Please add a one-line bio.');
      return;
    }
    startContinue(async () => {
      // Flush any pending debounced saves to ensure the latest values are persisted.
      const [mediumsResult, bioResult] = await Promise.all([
        saveStep2Mediums(Array.from(selected)),
        saveStep2Bio(bio),
      ]);
      if (!mediumsResult.ok) {
        setError(mediumsResult.error);
        return;
      }
      if (!bioResult.ok) {
        setError(bioResult.error);
        return;
      }
      router.push('/onboarding/step-3');
    });
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* Medium tags fill the full content area — they pre-date the 310px
          form-column rule, and their wrapping makes the wider canvas feel
          intentional. */}
      <div className="flex flex-wrap items-start gap-[8px] w-full">
        {mediums.map((m) => {
          const isOn = selected.has(m.id);
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => toggle(m.id)}
              aria-pressed={isOn}
              className={[
                'rounded-full px-[12px] py-[8px] font-sans font-medium text-[14px] leading-[20px] border',
                isOn
                  ? 'bg-accent/10 border-surface text-accent'
                  : 'bg-surface border-field text-muted',
              ].join(' ')}
            >
              {m.name}
            </button>
          );
        })}
      </div>
      <span aria-hidden className="h-[32px] w-px shrink-0" />
      <div className="w-full max-w-[310px] flex flex-col items-center">
        <label htmlFor="bio" className="font-sans font-medium text-[13px] leading-[18px] text-muted w-full">
          In one line, who are you as an artist?
        </label>
        <span aria-hidden className="h-[6px] w-px shrink-0" />
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, MAX_BIO))}
          rows={5}
          maxLength={MAX_BIO}
          placeholder="e.g. I paint figurative and landscape oil paintings in rural Georgia"
          className={
            'w-full rounded-[8px] bg-surface border border-field px-[14px] py-[10px] resize-none ' +
            'font-sans text-[15px] leading-[24px] text-ink placeholder:text-placeholder ' +
            'focus:border-accent focus:outline-none focus:ring-0'
          }
        />
        <span aria-hidden className="h-[6px] w-px shrink-0" />
        <p className="font-sans text-[12px] leading-[18px] text-muted text-right w-full">
          {bio.length} / {MAX_BIO}
        </p>
        <span aria-hidden className="h-[32px] w-px shrink-0" />
        <button
          type="button"
          onClick={onContinue}
          disabled={continuePending || selected.size === 0 || !bio.trim()}
          className={
            'flex items-center justify-center w-full h-[48px] rounded-[8px] bg-accent text-surface ' +
            'font-semibold text-[16px] leading-[24px] transition-opacity ' +
            'disabled:opacity-40 disabled:cursor-not-allowed'
          }
        >
          {continuePending ? 'Saving…' : 'Continue'}
        </button>
        {error && (
          <p role="alert" className="mt-[8px] text-accent text-[13px] text-center">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
