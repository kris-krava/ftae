'use client';

import { useState, useTransition } from 'react';
import { toggleUserActive } from '@/app/_actions/admin';
import type { AdminUserRow } from '@/app/_lib/admin';

interface UserRowProps {
  user: AdminUserRow;
  disableSelf: boolean;
}

export function UserRow({ user, disableSelf }: UserRowProps) {
  const [isActive, setIsActive] = useState(user.is_active);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const joined = new Date(user.created_at).toISOString().slice(0, 10);

  function onToggle() {
    setError(null);
    start(async () => {
      const result = await toggleUserActive(user.id, isActive);
      if (!result.ok) setError(result.error);
      else setIsActive(result.isActive);
    });
  }

  return (
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
        {error && <p className="text-accent text-[11px] mt-[4px]">{error}</p>}
      </Td>
    </tr>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-[12px] py-[8px] align-top ${className ?? ''}`}>{children}</td>;
}
