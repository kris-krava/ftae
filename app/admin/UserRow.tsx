'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleUserActive, deleteUser } from '@/app/_actions/admin';
import { useBodyScrollLock } from '@/lib/use-body-scroll-lock';
import { useFocusTrap } from '@/lib/use-focus-trap';
import type { AdminUserRow } from '@/app/_lib/admin';

interface UserRowProps {
  user: AdminUserRow;
  disableSelf: boolean;
}

export function UserRow({ user, disableSelf }: UserRowProps) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(user.is_active);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const joined = new Date(user.created_at).toISOString().slice(0, 10);

  function onToggle() {
    setError(null);
    start(async () => {
      const result = await toggleUserActive(user.id, isActive);
      if (!result.ok) setError(result.error);
      else setIsActive(result.isActive);
    });
  }

  function onConfirmDelete() {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteUser(user.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      setDeleted(true);
      setConfirmOpen(false);
      // Refresh so the deleted row drops out of the listing.
      router.refresh();
    });
  }

  if (deleted) return null;

  return (
    <>
      <tr className={`border-b border-divider/30 ${isActive ? '' : 'bg-canvas/40 text-muted'}`}>
        <Td>{user.name ?? '—'}</Td>
        <Td className="font-mono text-[12px]">{user.email}</Td>
        <Td className="font-mono text-[12px]">{user.username}</Td>
        <Td className="font-mono text-[12px]">{joined}</Td>
        <Td className="text-right tabular-nums">{user.profile_completion_pct}</Td>
        <Td className="text-center">{user.is_founding_member ? '✓' : ''}</Td>
        <Td className="text-center">{isActive ? 'on' : 'off'}</Td>
        <Td className="text-right tabular-nums">{user.referral_count}</Td>
        <Td className="font-mono text-[11px] text-muted">
          {user.recent_ips.length === 0 ? '—' : user.recent_ips.join(', ')}
        </Td>
        <Td>
          <div className="flex items-center gap-[6px]">
            <button
              type="button"
              onClick={onToggle}
              disabled={pending || disableSelf}
              aria-label={isActive ? `Deactivate ${user.username}` : `Activate ${user.username}`}
              className={
                'rounded-[6px] px-[10px] py-[4px] font-sans font-medium text-[12px] ' +
                (isActive
                  ? 'bg-accent/10 text-accent border border-accent/40'
                  : 'bg-accent text-surface') +
                ' disabled:opacity-40 disabled:cursor-not-allowed'
              }
            >
              {pending ? '…' : isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={disableSelf}
              aria-label={`Delete ${user.username} permanently`}
              className={
                'rounded-[6px] px-[10px] py-[4px] font-sans font-medium text-[12px] ' +
                'bg-surface text-accent border border-accent/40 ' +
                'disabled:opacity-40 disabled:cursor-not-allowed'
              }
            >
              Delete
            </button>
          </div>
          {error && <p className="text-accent text-[11px] mt-[4px]">{error}</p>}
        </Td>
      </tr>
      {confirmOpen && (
        <ConfirmDeleteModal
          username={user.username}
          email={user.email}
          pending={deletePending}
          error={deleteError}
          onCancel={() => {
            if (!deletePending) {
              setConfirmOpen(false);
              setDeleteError(null);
            }
          }}
          onConfirm={onConfirmDelete}
        />
      )}
    </>
  );
}

interface ConfirmDeleteModalProps {
  username: string;
  email: string;
  pending: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

function ConfirmDeleteModal({
  username,
  email,
  pending,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  useBodyScrollLock();
  const trapRef = useFocusTrap<HTMLDivElement>();

  return (
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-label="Confirm delete user"
      className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center px-[32px]"
      onClick={(e) => {
        if (e.currentTarget === e.target) onCancel();
      }}
    >
      <div className="bg-surface rounded-[16px] shadow-modal w-full max-w-[420px] flex flex-col p-[32px] gap-[16px]">
        <h3 className="font-sans font-semibold text-[18px] leading-[24px] text-ink">
          Delete this user?
        </h3>
        <p className="font-sans text-[14px] leading-[20px] text-muted">
          This permanently removes <span className="text-ink font-medium">@{username}</span>{' '}
          ({email}) — including their artwork, photos, follows, bookmarks, and notifications.
          This cannot be undone.
        </p>
        {error && (
          <p role="alert" className="font-sans text-[13px] leading-[18px] text-accent">
            {error}
          </p>
        )}
        <div className="flex gap-[12px] mt-[8px]">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={
              'flex-1 h-[44px] rounded-[8px] bg-surface border border-accent text-accent ' +
              'font-sans font-semibold text-[14px] disabled:opacity-60'
            }
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={
              'flex-1 h-[44px] rounded-[8px] bg-accent text-surface ' +
              'font-sans font-semibold text-[14px] disabled:opacity-60'
            }
          >
            {pending ? 'Deleting…' : 'Delete user'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-[12px] py-[8px] align-top ${className ?? ''}`}>{children}</td>;
}
