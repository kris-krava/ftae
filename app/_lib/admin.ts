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
  recent_ips: string[];
}

const PAGE_SIZE = 50;

export async function fetchAdminUsersPage(
  cursor: string | null,
  options: { includeTestUsers?: boolean } = {},
): Promise<{
  items: AdminUserRow[];
  nextCursor: string | null;
}> {
  let query = supabaseAdmin
    .from('users')
    .select(
      'id, name, email, username, created_at, profile_completion_pct, is_founding_member, is_active, role, is_test_user',
    )
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (!options.includeTestUsers) query = query.eq('is_test_user', false);
  if (cursor) query = query.lt('created_at', cursor);

  const { data: users } = await query;
  if (!users || users.length === 0) return { items: [], nextCursor: null };

  const userIds = users.slice(0, PAGE_SIZE).map((u) => u.id as string);

  const [referralsRes, ipsRes] = await Promise.all([
    supabaseAdmin
      .from('referrals')
      .select('referrer_user_id')
      .in('referrer_user_id', userIds),
    supabaseAdmin
      .from('user_ips')
      .select('user_id, ip_address, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: false }),
  ]);

  const referralCount = new Map<string, number>();
  for (const row of referralsRes.data ?? []) {
    const id = (row as { referrer_user_id: string }).referrer_user_id;
    referralCount.set(id, (referralCount.get(id) ?? 0) + 1);
  }

  const ipsByUser = new Map<string, string[]>();
  for (const row of ipsRes.data ?? []) {
    const r = row as { user_id: string; ip_address: string };
    const arr = ipsByUser.get(r.user_id) ?? [];
    if (arr.length < 3 && !arr.includes(r.ip_address)) arr.push(r.ip_address);
    ipsByUser.set(r.user_id, arr);
  }

  const items: AdminUserRow[] = users.slice(0, PAGE_SIZE).map((u) => ({
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
    referral_count: referralCount.get(u.id as string) ?? 0,
    recent_ips: ipsByUser.get(u.id as string) ?? [],
  }));

  const nextCursor = users.length > PAGE_SIZE ? items[items.length - 1].created_at : null;
  return { items, nextCursor };
}
