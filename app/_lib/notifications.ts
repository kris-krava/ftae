import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export type NotificationType =
  | 'profile_nudge'
  | 'referral_joined'
  | 'referral_completed'
  | 'trade_proposal'
  | 'trade_match'
  | 'system';

export interface NotificationRow {
  id: string;
  type: NotificationType;
  message: string;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export async function fetchUserNotifications(userId: string, limit = 50): Promise<NotificationRow[]> {
  const { data } = await supabaseAdmin
    .from('notifications')
    .select('id, type, message, is_read, action_url, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as NotificationRow[];
}
