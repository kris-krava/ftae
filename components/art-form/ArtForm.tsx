'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { XClose, XCircle } from '@/components/icons';
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock';
import { useFocusTrap } from '@/lib/use-focus-trap';
import { ArtFormBody } from './ArtFormBody';
import type { ArtFormCommitPayload, ArtFormResult } from './ArtFormBody';
import type { ArtworkDetail } from '@/app/_lib/profile';

// Re-export so existing consumers keep their imports working.
export type { ArtFormCommitPayload, ArtFormCommitPhoto, ArtFormResult } from './ArtFormBody';

const SUCCESS_DISPLAY_MS = 1200;

interface ArtFormProps {
  /** Pre-fills fields and seeds existing photos. null = create mode. */
  artwork: ArtworkDetail | null;
  /** Modal title (e.g. "Add Art" / "Edit Art"). */
  headerTitle: string;
  /** Subtitle copy under the header. */
  headerSubtitle?: string;
  /** Submit button label (e.g. "Add Art" / "Save Art"). */
  submitLabel: string;
  /** Submit label while pending (e.g. "Uploading…" / "Saving…"). */
  submittingLabel: string;
  /** Reserved for the post-save splash. Currently unused — save shows an inline toast in the body. */
  successLabel: string;
  /** Called after photos have been uploaded to Storage; consumer dispatches
   *  the appropriate commit server action with the resulting paths + metadata. */
  onCommit: (payload: ArtFormCommitPayload) => Promise<ArtFormResult>;
  /** When provided, renders the Delete button + confirm dialog. */
  onDelete?: () => Promise<ArtFormResult>;
  /** Success copy after delete (e.g. "Art deleted"). Required when onDelete is provided. */
  deleteSuccessLabel?: string;
  /** Where to navigate on close in standalone mode. */
  backHref: string;
  /** "overlay" dismisses via router.back() (page behind survives); "standalone" pushes backHref. */
  mode: 'overlay' | 'standalone';
}

export function ArtForm({
  artwork,
  headerTitle,
  headerSubtitle = "One piece you made, and would love another artist to have.",
  submitLabel,
  submittingLabel,
  onCommit,
  onDelete,
  deleteSuccessLabel,
  backHref,
  mode,
}: ArtFormProps) {
  const router = useRouter();
  useBodyScrollLock();
  const trapRef = useFocusTrap<HTMLDivElement>();

  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmTrapRef = useFocusTrap<HTMLDivElement>(confirmOpen);
  const [deleted, setDeleted] = useState(false);
  const [deleting, startDeleting] = useTransition();

  function close() {
    if (mode === 'overlay') router.back();
    else router.push(backHref);
  }

  function handleDelete() {
    if (!onDelete) return;
    setError(null);
    startDeleting(async () => {
      const res = await onDelete();
      if (!res.ok) {
        setError(res.error ?? 'Could not delete.');
        setConfirmOpen(false);
        return;
      }
      setConfirmOpen(false);
      setDeleted(true);
      setTimeout(() => {
        // No router.refresh() — refreshing while the URL is still
        // /app/edit-art/<id> re-mounts the @modal intercept whose
        // getArtworkDetail() now returns null, causing notFound() to
        // bubble to the root not-found page and a full-screen 404 flash
        // before we navigate away.
        if (mode === 'overlay') router.back();
        else router.push(backHref);
      }, SUCCESS_DISPLAY_MS);
    });
  }

  if (deleted) {
    return (
      <div className="fixed inset-0 z-50 bg-black/45 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center px-[16px] py-[24px]">
          <div
            role="status"
            aria-live="polite"
            className="bg-surface rounded-[16px] shadow-modal flex flex-col items-center text-center px-[32px] py-[32px] gap-[16px]"
          >
            <XCircle
              className="w-[64px] h-[64px] text-accent animate-[ftae-pop_360ms_cubic-bezier(0.34,1.56,0.64,1)_both]"
              strokeWidth={2.5}
              aria-hidden
            />
            <p className="font-sans font-semibold text-[18px] leading-[24px] text-ink">
              {deleteSuccessLabel ?? 'Done'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={trapRef} role="dialog" aria-modal="true" aria-label={headerTitle} className="fixed inset-0 z-50 bg-black/45 overflow-y-auto">
      <div
        className="min-h-full flex items-center justify-center px-[16px] py-[24px]"
        onClick={(e) => {
          if (e.currentTarget === e.target && !deleting && !confirmOpen) close();
        }}
      >
        <div className="bg-surface rounded-[16px] shadow-modal w-full max-w-[358px] tab:max-w-[440px] desk:max-w-[580px] relative">
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-[32px] right-[32px] flex items-center justify-center w-[24px] h-[24px] z-10"
          >
            <XClose className="w-[24px] h-[24px] text-ink" strokeWidth={1.25} />
          </button>

          <h2 className="font-sans font-semibold text-[18px] text-ink pt-[32px] px-[32px]">
            {headerTitle}
          </h2>
          <p className="font-sans text-[15px] text-ink/70 leading-[1.4] px-[32px] mt-[16px]">
            {headerSubtitle}
          </p>

          <div className="p-[32px]">
            <ArtFormBody
              artwork={artwork}
              submitLabel={submitLabel}
              submittingLabel={submittingLabel}
              onCommit={onCommit}
              onSaved={close}
              onDeleteClick={onDelete ? () => setConfirmOpen(true) : undefined}
              deleting={deleting}
            />
            {error && (
              <p role="alert" className="text-accent text-[13px] text-center mt-[12px]">
                {error}
              </p>
            )}
          </div>
        </div>
      </div>

      {confirmOpen && onDelete && (
        <div
          ref={confirmTrapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Confirm delete"
          className="fixed inset-0 z-[60] bg-black/45 flex items-center justify-center px-[32px]"
          onClick={(e) => {
            if (e.currentTarget === e.target && !deleting) setConfirmOpen(false);
          }}
        >
          <div className="bg-surface rounded-[16px] shadow-modal w-full max-w-[326px] flex flex-col items-center text-center p-[32px] gap-[16px]">
            <h3 className="font-sans font-semibold text-[18px] leading-[24px] text-ink">Are you sure?</h3>
            <p className="font-sans text-[14px] leading-[20px] text-muted">This is permanent.</p>
            <div className="flex gap-[12px] w-full">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="flex-1 h-[48px] rounded-[8px] bg-surface border border-accent text-accent font-semibold text-[16px] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-[48px] rounded-[8px] bg-surface border border-accent text-accent font-semibold text-[16px] disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete art'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
