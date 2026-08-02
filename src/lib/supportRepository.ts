// Support tickets + app feedback — synced to existing/new tables.
// tickets: existing support_tickets (created_by = customer)
// feedback: new customer_feedback (owner-approved)

import type { SupabaseClient } from '@supabase/supabase-js';

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  description: string;
  status: string;
  createdAt: string;
}

const TICKET_COLUMNS = 'id, subject, category, description, status, created_at';

const isMissingTableError = (error: { code?: string; message?: string } | null): boolean => {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /could not find a table|relation .* does not exist/i.test(error.message || '')
  );
};

export async function loadSupportTickets(
  client: SupabaseClient,
  userId: string,
): Promise<SupportTicket[]> {
  const { data, error } = await client
    .from('support_tickets')
    .select(TICKET_COLUMNS)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    subject: String(row.subject ?? 'Support request'),
    category: String(row.category ?? 'general'),
    description: String(row.description ?? ''),
    status: String(row.status ?? 'open'),
    createdAt: String(row.created_at ?? ''),
  }));
}

export async function createSupportTicket(
  client: SupabaseClient,
  userId: string,
  input: { subject: string; category: string; description: string },
): Promise<SupportTicket> {
  const { data, error } = await client
    .from('support_tickets')
    .insert({
      created_by: userId,
      subject: input.subject.trim(),
      category: input.category.trim() || 'general',
      description: input.description.trim(),
      status: 'open',
      priority: 'normal',
    })
    .select(TICKET_COLUMNS)
    .single();
  if (error) throw error;
  return {
    id: String(data.id),
    subject: String(data.subject ?? 'Support request'),
    category: String(data.category ?? 'general'),
    description: String(data.description ?? ''),
    status: String(data.status ?? 'open'),
    createdAt: String(data.created_at ?? ''),
  };
}

export function subscribeToSupportTickets(
  client: SupabaseClient,
  userId: string,
  onChange: () => void,
): () => void {
  const channel = client
    .channel(`nxu-support-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'support_tickets', filter: `created_by=eq.${userId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

export async function submitFeedback(
  client: SupabaseClient,
  userId: string,
  rating: number,
  message: string,
): Promise<void> {
  const { error } = await client.from('customer_feedback').insert({
    user_id: userId,
    rating: rating >= 1 && rating <= 5 ? rating : null,
    message: message.trim(),
  });
  if (error) throw error;
}
