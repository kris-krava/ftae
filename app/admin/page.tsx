import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { fetchAdminUsersPage } from '@/app/_lib/admin';
import { UserRow } from './UserRow';

export const dynamic = 'force-dynamic';

interface AdminPageProps {
  searchParams: { cursor?: string; test?: string };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  // Belt-and-braces server-side role check (middleware also enforces).
  const { data: caller } = await supabaseAdmin
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single();
  if (!caller || caller.is_active === false) redirect('/');
  if (caller.role !== 'admin' && caller.role !== 'super_admin') redirect('/');

  const cursor = searchParams.cursor ?? null;
  const includeTestUsers = searchParams.test === '1';
  const { items, nextCursor } = await fetchAdminUsersPage(cursor, { includeTestUsers });

  return (
    <main className="bg-canvas min-h-screen w-full p-[24px]">
      <header className="mb-[16px] flex items-end justify-between gap-[12px] flex-wrap">
        <div>
          <h1 className="font-sans font-semibold text-[20px] text-ink">Admin · Users</h1>
          <p className="font-sans text-[13px] text-muted mt-[4px]">
            Signed in as {user.email} ({caller.role})
          </p>
        </div>
        <Link
          href={includeTestUsers ? '/admin' : '/admin?test=1'}
          className="font-sans text-[13px] text-accent underline"
        >
          {includeTestUsers ? 'Hide test users' : 'Show test users'}
        </Link>
      </header>

      <div className="bg-surface rounded-[8px] overflow-x-auto border border-divider">
        <table className="w-full font-sans text-[13px] text-ink">
          <thead className="bg-canvas/40">
            <tr className="text-left">
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Username</Th>
              <Th>Joined</Th>
              <Th>%</Th>
              <Th>FM</Th>
              <Th>Active</Th>
              <Th>Refs</Th>
              <Th>Recent IPs</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-[12px] py-[24px] text-center text-muted">
                  No users to show.
                </td>
              </tr>
            ) : (
              items.map((u) => (
                <UserRow key={u.id} user={u} disableSelf={u.id === user.id} />
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav className="mt-[16px] flex items-center justify-between">
        {cursor ? (
          <Link
            href="/admin"
            className="font-sans text-[13px] text-accent underline"
          >
            ← First page
          </Link>
        ) : (
          <span />
        )}
        {nextCursor ? (
          <Link
            href={`/admin?cursor=${encodeURIComponent(nextCursor)}`}
            className="font-sans text-[13px] text-accent underline"
          >
            Next page →
          </Link>
        ) : (
          <span className="font-sans text-[13px] text-muted">End of list.</span>
        )}
      </nav>
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-[12px] py-[10px] font-medium text-[11px] tracking-[0.5px] text-muted uppercase border-b border-divider/50">
      {children}
    </th>
  );
}
