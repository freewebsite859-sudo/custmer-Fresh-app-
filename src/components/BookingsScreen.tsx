import React, { useState, useEffect } from 'react';
import { Booking, Screen, Salon, ServiceReview } from '../types';
import { ServiceReviewModal } from './ServiceReviewModal';
import { BookingDetailsModal } from './BookingDetailsModal';
import { CancelBookingModal } from './CancelBookingModal';
import { PaymentStatusBadge } from './PaymentStatusTracker';

interface BookingsScreenProps {
  bookings: Booking[];
  salons: Salon[];
  onNavigate: (screen: Screen) => void;
  onCancelBooking: (bookingId: string) => void;
  onTriggerTestNotification?: (bookingId: string) => void;
  onAddReview: (salonId: string, newReview: Omit<ServiceReview, 'id' | 'date'>) => void;
  onMarkBookingReviewed: (bookingId: string) => void;
  initialSelectedBookingId?: string;
  onTrackPayment?: (booking: Booking) => void;
  customerName?: string;
}

export const BookingsScreen: React.FC<BookingsScreenProps> = ({
  bookings,
  customerName = '',
  salons,
  onNavigate,
  onCancelBooking,
  onTriggerTestNotification,
  onAddReview,
  onMarkBookingReviewed,
  initialSelectedBookingId,
  onTrackPayment,
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(() => {
    if (initialSelectedBookingId) {
      return bookings.find((b) => b.id === initialSelectedBookingId) || null;
    }
    return null;
  });
  const [reviewModalBooking, setReviewModalBooking] = useState<Booking | null>(null);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);

  // Bookings whose 25% advance is pending stay visible under Upcoming,
  // with a live "Payment Pending" tracker badge.
  const upcomingBookings = bookings.filter(
    (b) => b.status === 'CONFIRMED' || b.status === 'PENDING' || b.status === 'payment_pending'
  );
  const pastBookings = bookings.filter(
    (b) => b.status === 'PAST' || b.status === 'COMPLETED'
  );
  const cancelledBookings = bookings.filter((b) => b.status === 'CANCELLED');

  const targetSalonForReview = reviewModalBooking
    ? salons.find((s) => s.id === reviewModalBooking.salonId) || salons[0]
    : salons[0];

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-5 pb-40 pt-2">
      {/* Segment Tabs */}
      <div className="flex items-center w-full bg-[#ffe8ed] rounded-2xl p-1 shadow-sm mt-2">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-3 px-3 rounded-xl text-[13px] font-semibold transition-all ${
            activeTab === 'upcoming'
              ? 'bg-white shadow-sm text-[#26181c]'
              : 'text-[#5a3f47] hover:text-[#26181c]'
          }`}
        >
          Upcoming ({upcomingBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`flex-1 py-3 px-3 rounded-xl text-[13px] font-semibold transition-all ${
            activeTab === 'past'
              ? 'bg-white shadow-sm text-[#26181c]'
              : 'text-[#5a3f47] hover:text-[#26181c]'
          }`}
        >
          Past ({pastBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={`flex-1 py-3 px-3 rounded-xl text-[13px] font-semibold transition-all ${
            activeTab === 'cancelled'
              ? 'bg-white shadow-sm text-[#26181c]'
              : 'text-[#5a3f47] hover:text-[#26181c]'
          }`}
        >
          Cancelled ({cancelledBookings.length})
        </button>
      </div>

      {/* Upcoming Tab */}
      {activeTab === 'upcoming' && (
        <div className="flex flex-col gap-4 w-full animate-in fade-in">
          {upcomingBookings.length > 0 ? (
            upcomingBookings.map((booking) => {
              const isConfirmed = booking.status === 'CONFIRMED';
              return (
                <div
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className="bg-white rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] hover:shadow-md relative overflow-hidden group border border-[#e8e8e8] hover:border-[#fcd5e8] cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase mb-2 ${
                          isConfirmed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {booking.status === 'payment_pending' ? 'PAYMENT PENDING' : booking.status}
                      </span>
                      <h3 className="text-[18px] text-[#26181c] font-bold mb-0.5 group-hover:text-[#e6007e] transition-colors">
                        {booking.salonName}
                      </h3>
                      <p className="text-[14px] text-[#5a3f47] font-medium">
                        {booking.services.map((s) => s.name).join(', ')}
                      </p>
                      <PaymentStatusBadge
                        status={booking.status}
                        onTrack={() => onTrackPayment?.(booking)}
                      />
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#ffe8ed] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[#8e004b]">content_cut</span>
                    </div>
                  </div>

                  {/* Date & Time Row */}
                  <div className="flex items-center gap-4 py-3 mb-4 border-t border-[#e8e8e8]/60 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#5a3f47] text-[20px]">
                        calendar_month
                      </span>
                      <span className="text-[13px] text-[#26181c] font-semibold">
                        {booking.dateStr}
                      </span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-[#8c7077]" />
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#5a3f47] text-[20px]">
                        schedule
                      </span>
                      <span className="text-[13px] text-[#26181c] font-semibold">
                        {booking.timeSlot}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 relative z-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedBooking(booking)}
                      className="flex-1 h-[44px] bg-[#fde7f3] hover:bg-[#e6007e] hover:text-white text-[#e6007e] text-[12px] font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                      <span>Manage & Confirmation</span>
                    </button>
                    {onTriggerTestNotification && (
                      <button
                        onClick={() => onTriggerTestNotification(booking.id)}
                        className="h-[44px] px-3 bg-[#26181c] hover:bg-black text-amber-300 text-[12px] font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        title="Test Push Notification"
                      >
                        <span className="material-symbols-outlined text-[16px] animate-pulse text-amber-400">notifications_active</span>
                        <span className="hidden sm:inline">Test Push</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center w-full bg-white rounded-3xl p-6 border border-[#e8e8e8] shadow-xs">
              <div className="relative flex flex-col items-center justify-center pt-2 pb-4 overflow-hidden w-full">
                <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                  {/* Backdrop Layer */}
                  <div className="absolute inset-0 bg-[#ffe8ed] rounded-[28px] shadow-[0_20px_50px_rgba(185,0,100,0.08)] transform rotate-3 scale-95 opacity-60" />
                  {/* Illustration Card */}
                  <div className="relative bg-[#fff8f8] p-6 rounded-[28px] shadow-[0_20px_40px_rgba(0,0,0,0.04)] flex flex-col items-center justify-center border border-[#f0d8e2] backdrop-blur-sm transform transition-transform duration-700 hover:scale-105">
                    <img
                      src="https://lh3.googleusercontent.com/aida/AP1WRLvGzKjct_wR2U_SA6UaE6xIqVKmdarxdE-tIG6jEoxCttfw2qCdybC_JpAE5cSz5628IgHjJmahfD0ITfcv3h4E-3MrQnC8znhpSresnL8WHED1WgL86q0VJ0_hccS9XLV9nQSiLiyZrFxRHMDpIvuMECBI2s6ePGzF_aeLKPtRFXMXfjzNJtTSlDcJFvt0DsrKxo7sxPMDd4sCYAr0nqFLiOAYOZTuQdonPJgSnH0EApgD_nnfaVzzcw"
                      alt="No upcoming bookings"
                      referrerPolicy="no-referrer"
                      className="w-28 h-28 object-contain mb-3 filter drop-shadow-xs"
                    />
                    <div className="flex gap-1.5">
                      <div className="w-6 h-1 bg-[#b90064]/20 rounded-full" />
                      <div className="w-3 h-1 bg-[#e6007e]/15 rounded-full" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center text-center space-y-1.5 mt-2 max-w-sm mx-auto">
                <h3 className="text-[20px] font-bold text-[#26181c]">No upcoming bookings</h3>
                <p className="text-[13px] text-[#5a3f47] leading-relaxed px-2">
                  You haven't scheduled any services yet. Discover top-rated salons and book your next appointment.
                </p>
              </div>

              <div className="mt-6 flex flex-col items-center w-full gap-2">
                <button
                  onClick={() => onNavigate('home')}
                  className="w-full h-[50px] bg-[#e6007e] hover:bg-[#b90064] text-white font-bold text-[14px] rounded-xl shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer group"
                >
                  <span>Explore Salons</span>
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('past')}
                  className="h-[40px] px-6 text-[#e6007e] font-bold text-xs flex items-center justify-center hover:bg-[#fde7f3]/60 rounded-xl transition-colors cursor-pointer"
                >
                  View past history
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Past Tab */}
      {activeTab === 'past' && (
        <div className="flex flex-col gap-4 w-full animate-in fade-in">
          {pastBookings.length > 0 ? (
            pastBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] relative overflow-hidden group border border-[#e8e8e8]"
              >
                <div className="flex justify-between items-start mb-3 relative z-10">
                  <div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase mb-2 bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Completed
                    </span>
                    <h3 className="text-[18px] text-[#26181c] font-bold mb-0.5">
                      {booking.salonName}
                    </h3>
                    <p className="text-[14px] text-[#5a3f47] font-medium">
                      {booking.services.map((s) => s.name).join(', ')}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-emerald-600">check_circle</span>
                  </div>
                </div>

                {/* Date & Time Row */}
                <div className="flex items-center gap-4 py-3 mb-4 border-t border-[#e8e8e8]/60 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#5a3f47] text-[20px]">
                      calendar_month
                    </span>
                    <span className="text-[13px] text-[#26181c] font-semibold">
                      {booking.dateStr}
                    </span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-[#8c7077]" />
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#5a3f47] text-[20px]">
                      schedule
                    </span>
                    <span className="text-[13px] text-[#26181c] font-semibold">
                      {booking.timeSlot}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {booking.isReviewed ? (
                    <div className="flex-1 h-[44px] bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px] text-amber-500 fill-current">star</span>
                      Review Submitted ⭐
                    </div>
                  ) : (
                    <button
                      onClick={() => setReviewModalBooking(booking)}
                      className="flex-1 h-[44px] bg-[#e6007e] text-white text-[12px] font-bold rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5 shadow-sm shadow-[#e6007e]/20 hover:bg-[#b90064]"
                    >
                      <span className="material-symbols-outlined text-[18px]">rate_review</span>
                      Leave a Review
                    </button>
                  )}
                  <button
                    onClick={() => onNavigate('home')}
                    className="h-[44px] px-4 bg-[#ffe8ed] text-[#e6007e] text-[12px] font-bold rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-1"
                  >
                    Rebook
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center w-full bg-white rounded-3xl p-6 border border-[#e8e8e8]">
              <div className="w-24 h-24 mb-4 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-[#e6007e]/5 rounded-full blur-xl" />
                <div className="relative w-16 h-16 bg-[#ffe8ed] rounded-full flex items-center justify-center text-[#8c7077]">
                  <span className="material-symbols-outlined text-[36px]">history</span>
                </div>
              </div>
              <h3 className="text-[18px] text-[#26181c] font-bold mb-1">No bookings found.</h3>
              <p className="text-[14px] text-[#5a3f47] mb-6 max-w-[260px]">
                Looks like you haven't completed any visits yet. Let's change that!
              </p>
              <button
                onClick={() => onNavigate('home')}
                className="w-full h-[52px] bg-[#e6007e] text-white text-[14px] font-semibold rounded-xl active:scale-95 transition-transform shadow-md shadow-[#e6007e]/30"
              >
                Book your first service
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancelled Tab */}
      {activeTab === 'cancelled' && (
        <div className="flex flex-col gap-4 animate-in fade-in">
          {cancelledBookings.length > 0 ? (
            cancelledBookings.map((b) => {
              const advancePaid = Math.round(b.totalAmount * 0.25);
              const refundAmount = Math.round(advancePaid * 0.5);
              return (
                <div
                  key={b.id}
                  className="bg-white rounded-[24px] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] relative overflow-hidden group border border-[#e8e8e8]"
                >
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase mb-2 bg-rose-50 text-rose-600 border border-rose-200">
                        Cancelled
                      </span>
                      <h3 className="text-[18px] text-[#26181c] font-bold mb-0.5">
                        {b.salonName}
                      </h3>
                      <p className="text-[14px] text-[#5a3f47] font-medium">
                        {b.services.map((s) => s.name).join(', ')}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-rose-600">close</span>
                    </div>
                  </div>

                  {/* Date & Time Row */}
                  <div className="flex items-center gap-4 py-3 mb-3 border-t border-[#e8e8e8]/60 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#5a3f47] text-[20px]">
                        calendar_month
                      </span>
                      <span className="text-[13px] text-[#26181c] font-semibold">
                        {b.dateStr}
                      </span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-[#8c7077]" />
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#5a3f47] text-[20px]">
                        schedule
                      </span>
                      <span className="text-[13px] text-[#26181c] font-semibold">
                        {b.timeSlot}
                      </span>
                    </div>
                  </div>

                  {/* Refund status bar */}
                  <div className="bg-[#fff0f2] rounded-xl px-3.5 py-2.5 flex items-center justify-between mb-4 border border-[#fcd5e8]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-[#003ea9]">
                        check_circle
                      </span>
                      <span className="text-[12px] font-medium text-[#594047]">
                        Refund Processed
                      </span>
                    </div>
                    <span className="text-[13px] font-bold text-[#26181c]">
                      ₹{refundAmount > 0 ? refundAmount : 125}.00
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedBooking(b)}
                      className="flex-1 h-[44px] bg-[#f6dce2] hover:bg-[#ffd9e2] text-[#26181c] text-[12px] font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => onNavigate('home')}
                      className="flex-1 h-[44px] bg-[#fde7f3] hover:bg-[#e6007e] hover:text-white text-[#e6007e] text-[12px] font-bold rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      Book Again
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl p-6 border border-[#e8e8e8]">
              <span className="material-symbols-outlined text-[40px] text-[#e0bec6] mb-2">block</span>
              <p className="text-sm font-semibold text-[#26181c]">No bookings found.</p>
            </div>
          )}
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <BookingDetailsModal
          booking={selectedBooking}
          salons={salons}
          isOpen={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCancel={(booking) => {
            setCancellingBooking(booking);
          }}
          onRebook={() => {
            setSelectedBooking(null);
            onNavigate('home');
          }}
        />
      )}

      {/* Cancel Booking Modal */}
      {cancellingBooking && (
        <CancelBookingModal
          booking={cancellingBooking}
          isOpen={!!cancellingBooking}
          onClose={() => setCancellingBooking(null)}
          onConfirmCancel={(bookingId) => {
            onCancelBooking(bookingId);
            setCancellingBooking(null);
            setSelectedBooking(null);
          }}
        />
      )}

      {/* Service Review Modal */}
      {reviewModalBooking && targetSalonForReview && (
        <ServiceReviewModal
          isOpen={!!reviewModalBooking}
          onClose={() => setReviewModalBooking(null)}
          salon={targetSalonForReview}
          preselectedServiceId={reviewModalBooking.services[0]?.id}
          authorName={customerName || 'Customer'}
          onSubmitReview={(newReview) => {
            onAddReview(reviewModalBooking.salonId, { ...newReview, bookingId: reviewModalBooking.id });
            onMarkBookingReviewed(reviewModalBooking.id);
          }}
        />
      )}
    </div>
  );
};
