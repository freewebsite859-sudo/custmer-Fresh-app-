// Customer service reviews — persisted to the SHARED Supabase project's
// `customer_reviews` table so they survive refresh and show on every device.
//
// The table may not exist yet on the shared schema (it is a Phase-1 schema
// addition; see db/customer_reviews.sql). Every call therefore degrades
// gracefully: if the table is missing (Postgres 42P01 / PGRST205) the
// repository returns "nothing stored" instead of failing the UI — the app
// keeps working with session-scoped reviews until ops runs the DDL.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ServiceReview } from '../types';

interface ReviewRow {
  id: string;
  user_id: string;
  salon_id: string;
  service_id?: string | null;
  service_name: string;
  author: string;
  rating: number;
  comment: string;
  verified_booking?: boolean;
  booking_id?: string | null;
  created_at?: string | null;
}

/** True for Postgres "relation does not exist" style errors. */
const isMissingTableError = (error: { code?: string; message?: string } | null): boolean => {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /could not find a table|relation .* does not exist/i.test(error.message || '')
  );
};

export async function loadReviews(
  client: SupabaseClient,
  userId: string,
): Promise<ServiceReview[]> {
  const { data, error } = await client
    .from('customer_reviews')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  const rows = (data ?? []) as ReviewRow[];
  return rows.map((r) => ({
    id: r.id,
    salonId: r.salon_id,
    serviceId: r.service_id ?? undefined,
    serviceName: r.service_name,
    author: r.author,
    rating: r.rating,
    date: r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
    comment: r.comment,
    verifiedBooking: r.verified_booking ?? false,
    bookingId: r.booking_id ?? undefined,
  }));
}

/** Upsert one review; idempotent by id (double-taps cannot duplicate rows). */
export async function saveReview(
  client: SupabaseClient,
  userId: string,
  review: ServiceReview,
): Promise<void> {
  const { error } = await client.from('customer_reviews').upsert(
    {
      id: review.id,
      user_id: userId,
      salon_id: review.salonId,
      service_id: review.serviceId ?? null,
      service_name: review.serviceName,
      author: review.author,
      rating: review.rating,
      comment: review.comment,
      verified_booking: review.verifiedBooking ?? false,
      booking_id: review.bookingId ?? null,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    // Table not provisioned yet → keep the review in session state only.
    if (isMissingTableError(error)) {
      console.warn('Reviews table not provisioned yet — review kept session-only. Run db/customer_reviews.sql.');
      return;
    }
    throw error;
  }
}

/** Realtime: any review added on another device refires onChange. */
export function subscribeToReviews(
  client: SupabaseClient,
  userId: string,
  onChange: () => void,
): () => void {
  const channel = client.channel(`nxu-reviews-${userId}`);
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'customer_reviews',
      filter: `user_id=eq.${userId}`,
    },
    () => onChange(),
  );
  channel.subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
