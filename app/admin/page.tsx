import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  fetchAdminUsersPage,
  ADMIN_PAGE_SIZE,
  ADMIN_SORT_COLUMNS,
  type AdminSortColumn,
  type AdminSortOrder,
} from '@/app/_lib/admin';
import { UserRow } from './UserRow';

interface AdminPageProps {
  searchParams: Promise<{
    page?: string;
    sort?: string;
    order?: string;
    test?: string;
  }>;
}

function parseSort(raw: string | undefined): AdminSortColumn {
  if (raw && (ADMIN_SORT_COLUMNS as readonly string[]).includes(raw)) {
    return raw as AdminSortColumn;
  }
  return 'created_at';
}

function parseOrder(raw: string | undefined): AdminSortOrder {
  return raw === 'asc' ? 'asc' : 'desc';
}

function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export default async function AdminPage(props: AdminPageProps) {
  const searchParams = await props.searchParams;
  const supabase = await createClient();
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

  const page = parsePage(searchParams.page);
  const sort = parseSort(searchParams.sort);
  const order = parseOrder(searchParams.order);
  const includeTestUsers = searchParams.test === '1';

  const { items, totalCount, totalPages, totalArtCount } = await fetchAdminUsersPage({
    page,
    sort,
    order,
    includeTestUsers,
  });

  const startIndex = (page - 1) * ADMIN_PAGE_SIZE;

  return (
    <main className="bg-canvas min-h-screen w-full p-[24px]">
      <header className="mb-[16px] flex items-end justify-between gap-[12px] flex-wrap">
        <div>
          <h1 className="font-sans font-semibold text-[20px] text-ink">
            Admin · Users ({totalCount}) · {totalArtCount} art
          </h1>
          <p className="font-sans text-[13px] text-muted mt-[4px]">
            Signed in as {user.email} ({caller.role})
          </p>
        </div>
        <Link
          href={includeTestUsers ? buildHref({ test: '0' }) : buildHref({ test: '1' })}
          className="font-sans text-[13px] text-accent underline"
        >
          {includeTestUsers ? 'Hide test users' : 'Show test users'}
        </Link>
      </header>

      <div className="bg-surface rounded-[8px] overflow-x-auto border border-divider">
        <table className="w-full font-sans text-[13px] text-ink">
          <thead className="bg-canvas/40">
            <tr className="text-left">
              <Th>#</Th>
              <SortableTh
                column="created_at"
                label="Joined"
                currentSort={sort}
                currentOrder={order}
                includeTestUsers={includeTestUsers}
              />
              <SortableTh
                column="name"
                label="Name"
                currentSort={sort}
                currentOrder={order}
                includeTestUsers={includeTestUsers}
              />
              <SortableTh
                column="email"
                label="Email"
                currentSort={sort}
                currentOrder={order}
                includeTestUsers={includeTestUsers}
              />
              <SortableTh
                column="username"
                label="Username"
                currentSort={sort}
                currentOrder={order}
                includeTestUsers={includeTestUsers}
              />
              <SortableTh
                column="profile_completion_pct"
                label="%"
                currentSort={sort}
                currentOrder={order}
                includeTestUsers={includeTestUsers}
                align="right"
              />
              <Th align="center">FM</Th>
              <SortableTh
                column="art_count"
                label="Art"
                currentSort={sort}
                currentOrder={order}
                includeTestUsers={includeTestUsers}
                align="right"
              />
              <Th align="center">Active</Th>
              <Th align="right">Refs</Th>
              <Th align="right">Credits</Th>
              <Th>Recent IPs</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-[12px] py-[24px] text-center text-muted">
                  No users to show.
                </td>
              </tr>
            ) : (
              items.map((u, i) => (
                <UserRow
                  key={u.id}
                  user={u}
                  rowNumber={startIndex + i + 1}
                  disableSelf={u.id === user.id}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <nav className="mt-[16px] flex items-center justify-between">
        {page > 1 ? (
          <Link
            href={buildHref({ page: String(page - 1) })}
            className="font-sans text-[13px] text-accent underline"
          >
            ← Previous
          </Link>
        ) : (
          <span />
        )}
        <span className="font-sans text-[13px] text-muted">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={buildHref({ page: String(page + 1) })}
            className="font-sans text-[13px] text-accent underline"
          >
            Next →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );

  function buildHref(overrides: Record<string, string>): string {
    const params = new URLSearchParams();
    if (page !== 1) params.set('page', String(page));
    if (sort !== 'created_at') params.set('sort', sort);
    if (order !== 'desc') params.set('order', order);
    if (includeTestUsers) params.set('test', '1');
    for (const [k, v] of Object.entries(overrides)) {
      if (v === '0' || v === '' || v === '1' && k === 'page') params.delete(k);
      else params.set(k, v);
    }
    // Defaults shouldn't appear in the URL
    if (params.get('page') === '1') params.delete('page');
    if (params.get('sort') === 'created_at') params.delete('sort');
    if (params.get('order') === 'desc') params.delete('order');
    if (params.get('test') === '0') params.delete('test');
    const qs = params.toString();
    return `/admin${qs ? `?${qs}` : ''}`;
  }
}

function Th({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
}) {
  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      className={`px-[12px] py-[10px] font-medium text-[11px] tracking-[0.5px] text-muted uppercase border-b border-divider/50 ${alignClass}`}
    >
      {children}
    </th>
  );
}

function SortableTh({
  column,
  label,
  currentSort,
  currentOrder,
  includeTestUsers,
  align = 'left',
}: {
  column: AdminSortColumn;
  label: string;
  currentSort: AdminSortColumn;
  currentOrder: AdminSortOrder;
  includeTestUsers: boolean;
  align?: 'left' | 'right' | 'center';
}) {
  const isActive = currentSort === column;
  // Click an active column toggles order; click another column resets to its
  // "natural" default direction (date defaults desc, everything else asc).
  const nextOrder: AdminSortOrder = isActive
    ? currentOrder === 'desc'
      ? 'asc'
      : 'desc'
    : column === 'created_at'
    ? 'desc'
    : 'asc';

  // Sorting always returns to page 1 — sort+page mid-list rarely makes sense
  // and the existing offset can land outside the new ordering.
  const params = new URLSearchParams();
  if (column !== 'created_at') params.set('sort', column);
  if (nextOrder !== 'desc') params.set('order', nextOrder);
  if (includeTestUsers) params.set('test', '1');
  const href = `/admin${params.toString() ? `?${params.toString()}` : ''}`;

  const arrow = isActive ? (currentOrder === 'desc' ? ' ↓' : ' ↑') : '';
  const alignClass =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <th
      className={`px-[12px] py-[10px] font-medium text-[11px] tracking-[0.5px] uppercase border-b border-divider/50 ${alignClass}`}
    >
      <Link
        href={href}
        className={`font-medium ${isActive ? 'text-accent' : 'text-muted hover:text-ink'}`}
      >
        {label}
        {arrow}
      </Link>
    </th>
  );
}
