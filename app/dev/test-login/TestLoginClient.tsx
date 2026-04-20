'use client';

import { useState, useTransition } from 'react';
import { runScenarioAction, cleanupTestUsersAction } from './actions';

interface ScenarioTile {
  id: string;
  name: string;
  description: string;
  redirect: string;
}

interface Props {
  scenarios: ScenarioTile[];
}

export function TestLoginClient({ scenarios }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busy, startBusy] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onRun(id: string) {
    setError(null);
    setMessage(null);
    setActiveId(id);
    startBusy(async () => {
      const result = await runScenarioAction(id);
      if (!result.ok || !result.url) {
        setError(result.error ?? 'Unknown error');
        return;
      }
      setMessage('Loading scenario…');
      window.location.href = result.url;
    });
  }

  function onCleanup() {
    setError(null);
    setMessage(null);
    if (!window.confirm('Delete ALL @test.ftae.local users from the database?')) return;
    setActiveId('cleanup');
    startBusy(async () => {
      const report = await cleanupTestUsersAction();
      const summary =
        `Deleted ${report.authUsersDeleted} auth users, ${report.publicRowsDeleted} profile rows, ` +
        `cleared ${report.storagePrefixesRemoved} storage prefixes.`;
      const errSummary = report.errors.length
        ? ` ${report.errors.length} error(s): ${report.errors.slice(0, 3).join('; ')}`
        : '';
      setMessage(summary + errSummary);
    });
  }

  return (
    <main className="min-h-screen bg-canvas px-[24px] py-[48px] flex flex-col items-center">
      <div className="w-full max-w-[640px] flex flex-col gap-[20px]">
        <header className="flex flex-col gap-[4px]">
          <h1 className="font-serif font-bold text-ink text-[28px] leading-[36px]">
            FTAE — Dev Test Login
          </h1>
          <p className="font-sans text-muted text-[14px] leading-[22px]">
            Local-only. Pick a scenario to seed state and land in-app.
          </p>
        </header>

        <aside
          role="alert"
          className="rounded-[12px] border border-accent bg-accent/10 px-[16px] py-[12px] flex flex-col gap-[10px]"
        >
          <p className="font-sans font-semibold text-accent text-[14px] leading-[22px]">
            Remember to delete test users before sharing screens or checking stats.
          </p>
          <p className="font-sans text-ink/80 text-[13px] leading-[20px]">
            Test users share the live database. Auto-cleanup runs when you re-pick a
            scenario, but nothing removes stale rows between sessions — do it manually.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={onCleanup}
            className={
              'rounded-[8px] bg-accent text-surface font-semibold text-[14px] px-[16px] py-[10px] ' +
              'self-start disabled:opacity-60'
            }
          >
            {busy && activeId === 'cleanup' ? 'Cleaning up…' : 'Delete all test users'}
          </button>
        </aside>

        <ul className="flex flex-col gap-[12px]">
          {scenarios.map((s) => {
            const isActive = busy && activeId === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onRun(s.id)}
                  className={
                    'w-full text-left rounded-[12px] bg-surface border border-field ' +
                    'px-[20px] py-[16px] flex flex-col gap-[4px] ' +
                    'hover:border-accent transition-colors ' +
                    'disabled:opacity-60'
                  }
                >
                  <div className="flex items-center gap-[8px]">
                    <span className="font-sans font-semibold text-ink text-[16px]">
                      {s.name}
                    </span>
                    <span className="font-sans text-muted text-[12px]">→ {s.redirect}</span>
                  </div>
                  <span className="font-sans text-muted text-[13px] leading-[20px]">
                    {s.description}
                  </span>
                  {isActive && (
                    <span className="font-sans text-accent text-[12px]">Seeding…</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-[8px] border-t border-field pt-[20px]">
          <p className="font-sans text-muted text-[12px]">
            Re-running a scenario auto-deletes the previous test user (primary + aux)
            before seeding. Identified by <code>@test.ftae.local</code> + the
            <code> is_test_user </code> flag. Cleanup cascades to mediums, artworks,
            credits, notifications, follows, referrals, and storage.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={onCleanup}
            className={
              'w-full rounded-[8px] bg-ink text-canvas font-semibold text-[14px] py-[12px] ' +
              'disabled:opacity-60'
            }
          >
            {busy && activeId === 'cleanup' ? 'Cleaning up…' : 'Delete all test users'}
          </button>
        </div>

        {message && (
          <p role="status" className="font-sans text-ink text-[13px] leading-[20px]">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="font-sans text-accent text-[13px] leading-[20px]">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
