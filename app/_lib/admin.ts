import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface AdminUserRow {
  id: string;
  name: string | null;
  email: string;
  username: string;
  created_at: string;
  profile_completion_pct: number;
  is_founding_member: boolean;
  is_active: boolean;
  role: string;
  is_test_user: boolean;
  referral_count: number;
  credits_count: number;
  art_count: number;
  recent_ips: string[];
}

export const ADMIN_PAGE_SIZE = 50;

export const ADMIN_SORT_COLUMNS = [
  'created_at',
  'name',
  'email',
  'username',
  'profile_completion_pct',
  'art_count',
] as const;
export type AdminSortColumn = (typeof ADMIN_SORT_COLUMNS)[number];
export type AdminSortOrder = 'asc' | 'desc';

export interface AdminFetchOptions {
  page: number; // 1-indexed
  sort: AdminSortColumn;
  order: AdminSortOrder;
  includeTestUsers?: boolean;
}

export async function fetchAdminUsersPage(
  options: AdminFetchOptions,
): Promise<{
  items: AdminUserRow[];
  totalCount: number;
  totalPages: number;
  totalArtCount: number;
}> {
  const page = Math.max(1, options.page);
  const offset = (page - 1) * ADMIN_PAGE_SIZE;
  const ascending = options.order === 'asc';

  let query = supabaseAdmin
    .from('admin_users_view')
    .select('*', { count: 'exact' })
    .order(options.sort, { ascending, nullsFirst: false })
    .range(offset, offset + ADMIN_PAGE_SIZE - 1);

  if (!options.includeTestUsers) query = query.eq('is_test_user', false);

  // Total active art count for the title — single cheap aggregate, runs in
  // parallel with the user-page query.
  const totalArtPromise = supabaseAdmin
    .from('artworks')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true);

  const [{ data: users, count }, { count: artCount }] = await Promise.all([
    query,
    totalArtPromise,
  ]);

  if (!users || users.length === 0) {
    return {
      items: [],
      totalCount: count ?? 0,
      totalPages: count ? Math.max(1, Math.ceil(count / ADMIN_PAGE_SIZE)) : 1,
      totalArtCount: artCount ?? 0,
    };
  }

  const userIds = users.map((u) => u.id as string);

  // IPs aren't in the view (they're time-ordered with a per-user limit; awkward
  // to express in SQL). Fetch separately and merge.
  const { data: ipRows } = await supabaseAdmin
    .from('user_ips')
    .select('user_id, ip_address, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false });

  const ipsByUser = new Map<string, string[]>();
  for (const row of ipRows ?? []) {
    const r = row as { user_id: string; ip_address: string };
    const arr = ipsByUser.get(r.user_id) ?? [];
    if (arr.length < 3 && !arr.includes(r.ip_address)) arr.push(r.ip_address);
    ipsByUser.set(r.user_id, arr);
  }

  const items: AdminUserRow[] = users.map((u) => ({
    id: u.id as string,
    name: u.name as string | null,
    email: u.email as string,
    username: u.username as string,
    created_at: u.created_at as string,
    profile_completion_pct: u.profile_completion_pct as number,
    is_founding_member: u.is_founding_member as boolean,
    is_active: u.is_active as boolean,
    role: u.role as string,
    is_test_user: (u as { is_test_user?: boolean }).is_test_user ?? false,
    referral_count: u.referral_count as number,
    credits_count: u.credits_count as number,
    art_count: u.art_count as number,
    recent_ips: ipsByUser.get(u.id as string) ?? [],
  }));

  const totalCount = count ?? 0;
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / ADMIN_PAGE_SIZE) : 1;

  return { items, totalCount, totalPages, totalArtCount: artCount ?? 0 };
}
