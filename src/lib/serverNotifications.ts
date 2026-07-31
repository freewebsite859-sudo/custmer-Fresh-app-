// Server notifications — existing `notifications` table (recipient_user_id).
// Device-local ephemeral notices (install/sync reminders) stay in memory only;
// they are never the source of truth.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppNotification } from '../types';

interface NotificationRow {
  id: string;
  notification_type: string | null;
  title: string | null;
  message: string | null;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string | null;
}

function rowToAppNotification(row: NotificationRow): AppNotification {
  const bookingId =
    row.data && typeof row.data === 'object' && typeof (row.data as any).booking_id === 'string'
      ? String((row.data as any).booking_id)
      : '';
  return {
    id: `srv-${row.id}`,
    bookingId,
    salonName: String(row.title ?? 'Nexora'),
    timeSlot: '',
    dateStr: '',
    servicesSummary: String(row.title ?? 'Notification'),
    timestamp: row.created_at ? Date.parse(row.created_at) : Date.now(),
    read: Boolean(row.read_at),
    type: 'general',
    message: String(row.message ?? ''),
  };
}

export async function loadServerNotifications(
  client: SupabaseClient,
  userId: string,
): Promise<AppNotification[]> {
  const { data, error } = await client
    .from('notifications')
    .select('id, notification_type, title, message, data, read_at, created_at')
    .eq('recipient_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => rowToAppNotification(row as NotificationRow));
}

export async function markAllServerNotificationsRead(
  client: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', userId)
    .is('read_at', null);
  if (error) throw error;
}

export function subscribeToServerNotifications(
  client: SupabaseClient,
  userId: string,
  onInsert: (notification: AppNotification) => void,
): () => void {
  const channel = client
    .channel(`nxu-notifications-${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as NotificationRow | null;
        if (row) onInsert(rowToAppNotification(row));
      },
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
