// Live booking-payment status tracking helpers.
// Authority = server (Razorpay webhook / Edge Function writing to `bookings`).
// This module ONLY interprets what a booking row actually contains — it never
// invents a confirmation. Any read failure degrades to 'unknown', never to 'confirmed'.

import type { SupabaseClient } from '@supabase/supabase-js';

export type PaymentSignal = 'confirmed' | 'pending' | 'unknown';

const CONFIRM_PATTERN = /paid|confirm|success|complete|captured|settled/i;
const PENDING_PATTERN = /pending|unpaid|due|await/i;

const STATUS_KEYS = [
  'advance_payment_status',
  'advance_status',
  'payment_status',
  'payment_state',
  'status',
  'booking_status',
] as const;

export function interpretBookingRow(
  row: Record<string, any> | null | undefined,
): PaymentSignal {
  if (!row || typeof row !== 'object') return 'unknown';

  // Boolean paid flags (e.g. advance_paid = true)
  for (const key of ['advance_paid', 'is_paid', 'paid', 'payment_done']) {
    if (typeof row[key] === 'boolean' && row[key]) return 'confirmed';
  }
  // A stored gateway payment reference means money has moved.
  if (row.advance_payment_id || row.razorpay_payment_id || row.payment_id) {
    return 'confirmed';
  }

  for (const key of STATUS_KEYS) {
    const value = row[key];
    if (value == null) continue;
    const s = String(value);
    if (/^payment_pending$/i.test(s)) return 'pending';
    if (CONFIRM_PATTERN.test(s)) return 'confirmed';
    if (PENDING_PATTERN.test(s)) return 'pending';
  }
  return 'unknown';
}

export interface BookingPaymentPoll {
  signal: PaymentSignal;
  /** true when the read itself failed (RLS/permission/network) — never fake-confirm. */
  readFailed: boolean;
}

export async function fetchBookingPaymentSignal(
  client: SupabaseClient,
  bookingId: string,
): Promise<BookingPaymentPoll> {
  try {
    const { data, error } = await client
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();
    if (error) return { signal: 'unknown', readFailed: true };
    return {
      signal: interpretBookingRow(data as Record<string, any> | null),
      readFailed: false,
    };
  } catch {
    return { signal: 'unknown', readFailed: true };
  }
}
