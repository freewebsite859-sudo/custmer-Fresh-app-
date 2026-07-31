// Live booking pipeline (Phase 1 – Step 2's next step: real booking + 25% advance).
// Exact mirror of the PROVEN upstream pipeline in main-website/app/nexora-app.tsx:
//   session -> rpc(create_customer_booking) -> functions.invoke(razorpay-create-order, stage "advance")
//   -> load checkout.js -> open Razorpay with the SERVER-calculated advance amount.
// No new DB objects. Razorpay secret never touches the browser (key_id is returned at runtime).

import type { SupabaseClient } from '@supabase/supabase-js';

type BookingResult = string | { id?: string; booking_id?: string };

export function bookingIdFrom(
  result: BookingResult | BookingResult[] | null,
): string | null {
  const value = Array.isArray(result) ? result[0] : result;
  if (typeof value === 'string') return value;
  return value?.booking_id ?? value?.id ?? null;
}

export interface CreateCustomerBookingInput {
  salonId: string;
  serviceIds: string[];
  staffId?: string | null;
  appointmentStart: Date;
  customerNote?: string | null;
}

export async function createCustomerBooking(
  client: SupabaseClient,
  input: CreateCustomerBookingInput,
): Promise<string> {
  if (
    Number.isNaN(input.appointmentStart.valueOf()) ||
    input.appointmentStart <= new Date()
  ) {
    throw new Error('Choose a future appointment date and time.');
  }
  const { data, error } = await client.rpc('create_customer_booking', {
    p_salon_id: input.salonId,
    p_service_ids: input.serviceIds,
    p_staff_id: input.staffId ?? null,
    p_appointment_start: input.appointmentStart.toISOString(),
    p_customer_note: (input.customerNote ?? '').trim() || null,
    p_idempotency_key: crypto.randomUUID(),
  });
  if (error) throw error;
  const bookingId = bookingIdFrom(
    data as BookingResult | BookingResult[] | null,
  );
  if (!bookingId) {
    throw new Error(
      'Booking was created, but its payment reference was not returned.',
    );
  }
  return bookingId;
}

export interface RazorpayAdvanceOrder {
  key: string;
  orderId: string;
  amount: number; // paise — computed server-side (25% advance)
  currency: string;
  name: string;
  description: string;
}

export async function createAdvanceOrder(
  client: SupabaseClient,
  accessToken: string,
  bookingId: string,
): Promise<RazorpayAdvanceOrder> {
  const { data: orderData, error } = await client.functions.invoke(
    'razorpay-create-order',
    {
      body: { booking_id: bookingId, stage: 'advance' },
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (error) throw error;
  const order = (orderData ?? {}) as Record<string, unknown>;
  const key = (order.key_id ?? order.key) as string | undefined;
  const orderId = (order.order_id ?? order.id) as string | undefined;
  if (!key || !orderId || !order.amount) {
    throw new Error('The secure advance checkout could not be prepared.');
  }
  return {
    key,
    orderId,
    amount: order.amount as number,
    currency: (order.currency as string) ?? 'INR',
    name: (order.name as string) ?? 'Nexora booking',
    description: (order.description as string) ?? '25% booking advance',
  };
}

const RAZORPAY_CHECKOUT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

export async function loadRazorpayCheckout(): Promise<void> {
  if ('Razorpay' in window) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${RAZORPAY_CHECKOUT_URL}"]`,
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Payment checkout could not be loaded.')),
        { once: true },
      );
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_CHECKOUT_URL;
    script.addEventListener('load', () => resolve(), { once: true });
    script.addEventListener(
      'error',
      () => reject(new Error('Payment checkout could not be loaded.')),
      { once: true },
    );
    document.body.appendChild(script);
  });
}

export interface RazorpayOpenCallbacks {
  /** Fired by Razorpay checkout.js ONLY after a successful payment (UPI/QR/cards). */
  onPaymentSuccess?: (paymentId: string | null) => void;
  /** Fired when the user closes the Razorpay window without completing payment. */
  onDismiss?: () => void;
}

export function openRazorpayAdvanceCheckout(
  order: RazorpayAdvanceOrder,
  prefillEmail: string,
  callbacks?: RazorpayOpenCallbacks,
): void {
  const Razorpay = (
    window as typeof window & {
      Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
    }
  ).Razorpay;
  if (!Razorpay) throw new Error('Payment checkout could not be loaded.');
  new Razorpay({
    key: order.key,
    order_id: order.orderId,
    amount: order.amount,
    currency: order.currency,
    name: order.name,
    description: order.description,
    prefill: { email: prefillEmail },
    theme: { color: '#e6007e' },
    handler: (response: { razorpay_payment_id?: string }) => {
      callbacks?.onPaymentSuccess?.(response?.razorpay_payment_id ?? null);
    },
    modal: {
      ondismiss: () => {
        callbacks?.onDismiss?.();
      },
    },
  }).open();
}

// ---------------------------------------------------------------------------
// Customer bookings list + realtime sync (task STEP 6: Bookings).
// Server is the source of truth; UI Bookings are rebuilt from rows.
// ---------------------------------------------------------------------------

export interface CustomerBookingRow {
  id: string;
  salon_id: string;
  appointment_start: string | null;
  appointment_end: string | null;
  status: string | null;
  total_paise: number | null;
  currency: string | null;
  customer_note: string | null;
  created_at: string | null;
  cancelled_at: string | null;
}

const BOOKING_COLUMNS =
  'id, salon_id, appointment_start, appointment_end, status, total_paise, currency, customer_note, created_at, cancelled_at';

export async function listCustomerBookings(
  client: SupabaseClient,
  userId: string,
): Promise<{ bookings: CustomerBookingRow[]; serviceIdsByBooking: Record<string, string[]> }> {
  const { data: rows, error } = await client
    .from('bookings')
    .select(BOOKING_COLUMNS)
    .eq('created_by', userId)
    .order('appointment_start', { ascending: false })
    .limit(50);
  if (error) throw error;
  const bookings = (rows ?? []) as CustomerBookingRow[];
  const ids = bookings.map((b) => b.id);
  const serviceIdsByBooking: Record<string, string[]> = {};
  if (ids.length) {
    const { data: items, error: itemsError } = await client
      .from('booking_items')
      .select('booking_id, service_id')
      .in('booking_id', ids);
    if (itemsError) throw itemsError;
    for (const item of items ?? []) {
      const key = String((item as any).booking_id);
      if (!serviceIdsByBooking[key]) serviceIdsByBooking[key] = [];
      serviceIdsByBooking[key].push(String((item as any).service_id));
    }
  }
  return { bookings, serviceIdsByBooking };
}

export function subscribeToCustomerBookings(
  client: SupabaseClient,
  userId: string,
  onChange: () => void,
): () => void {
  const channel = client
    .channel(`nxu-bookings-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'bookings', filter: `created_by=eq.${userId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
