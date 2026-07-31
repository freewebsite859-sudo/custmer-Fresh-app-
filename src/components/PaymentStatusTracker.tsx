// Visual feedback: live payment-status tracking for a booking, in-app.
// Shows real-time 'Payment Pending' → 'Payment received — confirming…' →
// 'Payment Confirmed' states after the Razorpay window (UPI/QR) interaction,
// without the customer leaving the app.
//
// Honesty contract:
//  - 'confirmed' renders ONLY when the bookings row itself proves payment
//    (server/webhook is the authority). Client-side Razorpay success only ever
//    shows the interim "confirming" stage.
//  - Read failures (RLS/permissions/network) show an honest degraded note —
//    never a fake green state.

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { fetchBookingPaymentSignal } from '../lib/paymentStatus';

const POLL_INTERVAL_MS = 5000;
const MAX_ATTEMPTS = 60; // 5 minutes of live tracking
const FIRST_CHECK_DELAY_MS = 4000;

export type TrackerStage = 'awaiting' | 'confirming' | 'confirmed' | 'timeout';

interface PaymentStatusTrackerProps {
  bookingId: string;
  salonName: string;
  /** true once Razorpay's official success handler fired (payment submitted client-side). */
  paymentSubmitted: boolean;
  /** Called exactly once when the server-side row proves the payment. */
  onConfirmed: (bookingId: string) => void;
  onClose: () => void;
}

export const PaymentStatusTracker: React.FC<PaymentStatusTrackerProps> = ({
  bookingId,
  salonName,
  paymentSubmitted,
  onConfirmed,
  onClose,
}) => {
  const [provedConfirmed, setProvedConfirmed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [liveUnavailable, setLiveUnavailable] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);
  const confirmedRef = useRef(false);
  const onConfirmedRef = useRef(onConfirmed);
  onConfirmedRef.current = onConfirmed;

  // Live polling loop against the real bookings row.
  useEffect(() => {
    if (!supabase) {
      setLiveUnavailable(true);
      setTimedOut(true);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let failures = 0;

    const tick = async () => {
      attempts += 1;
      const { signal, readFailed } = await fetchBookingPaymentSignal(
        supabase,
        bookingId,
      );
      if (cancelled) return;

      if (readFailed) {
        failures += 1;
        if (failures >= 3) setLiveUnavailable(true);
      }

      if (signal === 'confirmed' && !confirmedRef.current) {
        confirmedRef.current = true;
        setProvedConfirmed(true);
        onConfirmedRef.current(bookingId);
        return; // stop polling — server proved it
      }

      if (attempts >= MAX_ATTEMPTS) {
        setTimedOut(true);
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timer = setTimeout(tick, FIRST_CHECK_DELAY_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [bookingId, resetCounter]);

  const stage: TrackerStage = provedConfirmed
    ? 'confirmed'
    : timedOut
      ? 'timeout'
      : paymentSubmitted
        ? 'confirming'
        : 'awaiting';

  // Auto-dismiss the success card after a few seconds.
  useEffect(() => {
    if (stage !== 'confirmed') return;
    const t = setTimeout(() => onClose(), 5000);
    return () => clearTimeout(t);
  }, [stage, onClose]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    setLiveUnavailable(false);
    setTimedOut(false);
    setResetCounter((c) => c + 1);
    setTimeout(() => setRefreshing(false), POLL_INTERVAL_MS);
  };

  const theme =
    stage === 'confirmed'
      ? {
          ring: 'border-emerald-300',
          iconBox: 'bg-emerald-100 text-emerald-600',
          icon: 'check_circle',
          title: 'Payment Confirmed',
          body: `Advance received for ${salonName}. Your booking is now confirmed.`,
        }
      : stage === 'confirming'
        ? {
            ring: 'border-indigo-300',
            iconBox: 'bg-indigo-100 text-indigo-600',
            icon: 'sync',
            title: 'Payment received — confirming…',
            body: 'Server is finalizing your booking. This usually takes a few seconds and updates automatically.',
          }
        : stage === 'timeout'
          ? {
              ring: 'border-amber-300',
              iconBox: 'bg-amber-100 text-amber-600',
              icon: 'schedule',
              title: 'Still Payment Pending',
              body: `We could not fetch the live status yet — the booking at ${salonName} stays 'Payment Pending' until the server confirms it.`,
            }
          : {
              ring: 'border-amber-300',
              iconBox: 'bg-amber-100 text-amber-600',
              icon: 'payments',
              title: 'Payment Pending',
              body: 'Complete the 25% advance in the Razorpay window — UPI apps and QR scan are accepted. This card updates automatically.',
            };

  return (
    <div className="fixed inset-x-0 bottom-4 z-[120] flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl border-2 ${theme.ring} shadow-[0_12px_40px_rgba(0,0,0,0.18)] p-4 flex items-start gap-3`}
        role="status"
        aria-live="polite"
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${theme.iconBox}`}
        >
          <span
            className={`material-symbols-outlined text-[22px] ${
              stage === 'confirming' || refreshing ? 'animate-spin' : ''
            } ${stage === 'awaiting' ? 'animate-pulse' : ''}`}
          >
            {theme.icon}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-[#26181c]">{theme.title}</p>
          <p className="text-[12px] text-[#5a3f47] mt-0.5 leading-5">
            {theme.body}
          </p>
          {liveUnavailable && stage !== 'confirmed' && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 mt-2">
              Live status check is unavailable right now (permissions/network).
              The booking stays{' '}
              <span className="font-bold">Payment Pending</span> — no payment
              confirmation is faked.
            </p>
          )}
          <div className="flex items-center gap-2 mt-2.5">
            {stage === 'timeout' && (
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-[#e6007e] bg-[#fff0f3] border border-[#fcd5e8] rounded-lg px-2.5 py-1.5 hover:bg-[#fde7f3] transition-colors disabled:opacity-60"
              >
                <span className="material-symbols-outlined text-[15px]">
                  refresh
                </span>
                Check status now
              </button>
            )}
            {stage === 'confirmed' && (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-100 transition-colors"
              >
                Done
              </button>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close payment status"
          className="text-[#8c7077] hover:text-[#26181c] transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
};

interface PaymentStatusBadgeProps {
  status: string;
  /** Tap handler to open live tracking for this booking. */
  onTrack?: () => void;
}

/** Inline chip for booking list rows with a pending advance payment. */
export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({
  status,
  onTrack,
}) => {
  if (status !== 'payment_pending') return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onTrack?.();
      }}
      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1 hover:bg-amber-100 transition-colors animate-pulse"
    >
      <span className="material-symbols-outlined text-[14px]">payments</span>
      Payment Pending · Track live
    </button>
  );
};
