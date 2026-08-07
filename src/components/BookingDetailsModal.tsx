import React, { useState } from 'react';
import { Booking, Salon } from '../types';
import { BANNER_URL } from '../data/mockData';

interface BookingDetailsModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
  onRebook: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  salons?: Salon[];
}

export const BookingDetailsModal: React.FC<BookingDetailsModalProps> = ({
  booking,
  isOpen,
  onClose,
  onRebook,
  onCancel,
  salons = [],
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Find matching salon data for image & avatar details
  const salonData = salons.find((s) => s.id === booking.salonId || s.name.toLowerCase() === booking.salonName.toLowerCase());
  const salonImage = salonData?.image || BANNER_URL;
  const staffObj = salonData?.staff?.find((st) => st.name === booking.staffName) || salonData?.staff?.[0];

  const totalDuration = booking.services.reduce((acc, s) => acc + (s.durationMinutes || 45), 0);
  const advancePaid = Math.round(booking.totalAmount * 0.25);
  const balanceRemaining = booking.totalAmount - advancePaid;

  // Parse date for month badge
  const dateParts = booking.dateStr ? booking.dateStr.split(' ') : ['Thu,', '24', 'Jul'];
  const dayNumber = dateParts[1] || '24';
  const monthAbbr = dateParts[2] || 'Jul';

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDirections = () => {
    triggerToast('Location navigation will be available in the upcoming update.');
  };

  const handleCall = () => {
    triggerToast(`Connecting to ${booking.salonName} front desk...`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="bg-[#dbe1ff] text-[#00174b] px-3 py-1 rounded-full text-xs font-bold">Upcoming</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">Completed</span>;
      case 'CANCELLED':
        return <span className="bg-rose-100 text-rose-800 px-3 py-1 rounded-full text-xs font-bold">Cancelled</span>;
      default:
        return <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex justify-center items-end sm:items-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[250] bg-[#26181c] text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-xl flex items-center gap-2 border border-white/20 animate-in slide-in-from-top-2">
          <span className="material-symbols-outlined text-[16px] text-[#e6007e]">check_circle</span>
          {toastMessage}
        </div>
      )}

      <div className="bg-[#fff8f8] w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative border border-[#f6dce2]">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-[#e8e8e8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-[#26181c] rounded-full hover:bg-[#ffe8ed] transition-colors active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            </button>
            <div>
              <h2 className="text-[16px] font-bold text-[#26181c] leading-tight">Service Detail</h2>
              <p className="text-[11px] text-[#8c7077] font-medium">Ref: #NEX-{booking.id.toUpperCase()}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f6dce2] flex items-center justify-center text-[#26181c] hover:bg-[#e6007e] hover:text-white transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-[#26181c]">
          {/* Status Banner */}
          <div className="bg-[#fff0f2] rounded-2xl p-3.5 border border-[#fcd5e8] flex items-center gap-3.5 shadow-2xs">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 shadow-xs ${
              booking.status === 'CANCELLED' ? 'bg-rose-600' : 'bg-[#b90064]'
            }`}>
              <span className="material-symbols-outlined text-[22px]">
                {booking.status === 'CANCELLED' ? 'cancel' : 'check_circle'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-[15px] text-[#26181c] leading-snug">
                {booking.status === 'CANCELLED'
                  ? 'Booking Cancelled'
                  : booking.status === 'COMPLETED'
                  ? 'Service Completed'
                  : 'Your booking is confirmed'}
              </h3>
              <p className="text-[12px] font-medium text-[#5a3f47]">
                Booking ID: <span className="font-bold text-[#e6007e]">#NEX-{booking.id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}</span>
              </p>
            </div>
          </div>

          {/* Salon Bento Card */}
          <div className="bg-white rounded-2xl shadow-xs overflow-hidden border border-[#e8e8e8]">
            <div className="relative h-44 w-full">
              <img
                src={salonImage}
                alt={booking.salonName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 text-white">
                <h3 className="font-extrabold text-[18px] leading-tight text-white drop-shadow-sm">{booking.salonName}</h3>
                <p className="text-[12px] text-white/90 font-medium flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[15px] text-[#ffb0c8]">location_on</span>
                  {booking.locationArea}
                </p>
              </div>
            </div>
            <div className="p-3 bg-white flex items-center gap-2.5">
              <button
                onClick={handleDirections}
                className="flex-1 bg-[#fde7f3] hover:bg-[#e6007e] hover:text-white text-[#e6007e] font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">directions</span>
                Get Directions
              </button>
              <button
                onClick={handleCall}
                className="w-10 h-10 bg-[#f6dce2] hover:bg-[#e6007e] hover:text-white text-[#26181c] rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shrink-0"
                title="Call Salon"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
              </button>
            </div>
          </div>

          {/* Appointment Details Section */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#e8e8e8] space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#f0d8e2] pb-2.5">
              <h4 className="font-bold text-[15px] text-[#26181c] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#e6007e]">event_note</span>
                Appointment Details
              </h4>
              {getStatusBadge(booking.status)}
            </div>

            {/* Professional */}
            <div className="flex items-center gap-3 bg-[#fcf9f8] p-2.5 rounded-xl border border-[#f0d8e2]">
              <div className="w-11 h-11 rounded-full bg-[#f6dce2] overflow-hidden border border-[#fcd5e8] shrink-0">
                <img
                  src={
                    staffObj?.avatar ||
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuB6FnEPu-SL4wCFVKcdUT8T3HAr4WTtQffHbnb-a1Q_KHmwlXmuuMexI_oX7VO3Ck7qecdPxZscnfPyNFROadrFDvlkX2aKpGC7DKv8u_kCOn8d2MGCISl3rqUL79jDHNAaMeiBfwgEUSzl-uZoz702Y0_08nr4fJCuUBFEAasK6fvfIalsfNsECYrq-GqF_jzTRNgR4lOYUXXnfcExQ5qPrfu7Tw6Sle-tPP-le3KXO-hb9dwZ-x-2wkRrIieKF0Y75ikYZ-xFPME'
                  }
                  alt={booking.staffName || 'Stylist'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase font-extrabold text-[#8c7077] tracking-wider">Stylist</p>
                <p className="text-[14px] font-bold text-[#26181c] truncate">{booking.staffName || staffObj?.name || 'Salon Team'}</p>
              </div>
            </div>

            {/* Services */}
            <div className="bg-[#fff0f2] rounded-xl p-3 border border-[#fcd5e8]">
              <div className="flex items-center gap-1.5 text-[#26181c] mb-2">
                <span className="material-symbols-outlined text-[18px] text-[#e6007e]">content_cut</span>
                <p className="font-bold text-[13px]">Selected Services ({booking.services.length})</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {booking.services.map((s, idx) => (
                  <span
                    key={idx}
                    className="bg-white px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#26181c] border border-[#fcd5e8] shadow-2xs flex items-center justify-between gap-2"
                  >
                    <span>{s.name}</span>
                    <span className="text-[#e6007e] font-extrabold">₹{s.price}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Date & Time */}
            <div className="flex items-center gap-3 bg-[#fcf9f8] p-3 rounded-xl border border-[#f0d8e2]">
              <div className="w-12 h-12 rounded-xl bg-[#fde7f3] border border-[#fcd5e8] flex flex-col items-center justify-center shrink-0 shadow-2xs">
                <span className="text-[10px] font-black uppercase text-[#e6007e] leading-none">{monthAbbr}</span>
                <span className="text-[18px] font-extrabold text-[#26181c] leading-tight">{dayNumber}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#26181c]">{booking.dateStr} • {booking.timeSlot}</p>
                <p className="text-[11px] font-medium text-[#5a3f47]">Total Duration: {totalDuration} Mins</p>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#e8e8e8]">
            <h4 className="font-bold text-[15px] text-[#26181c] mb-3 border-b border-[#f0d8e2] pb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-[#e6007e]">payments</span>
              Payment Summary
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-[#5a3f47]">
                <span className="font-medium">Total Amount</span>
                <span className="font-bold text-[#26181c] text-sm">₹{booking.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-[#5a3f47]">
                  <span className="font-medium">Advance Paid</span>
                  <span className="material-symbols-outlined text-emerald-600 text-[16px] fill-current">check_circle</span>
                </div>
                <span className="font-bold text-emerald-600">- ₹{advancePaid.toLocaleString()}</span>
              </div>
              <div className="h-px bg-[#e8e8e8] my-1" />
              <div className="flex justify-between items-center bg-[#fde7f3]/80 p-3 rounded-xl border border-[#fcd5e8]">
                <div className="flex flex-col">
                  <span className="font-bold text-[13px] text-[#b90064]">Balance Remaining</span>
                  <span className="text-[10px] font-bold text-[#e6007e] uppercase tracking-wider">Pay at Salon</span>
                </div>
                <span className="text-[18px] font-extrabold text-[#b90064]">₹{balanceRemaining.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </main>

        {/* Action Footer */}
        <footer className="p-4 bg-white border-t border-[#e8e8e8] space-y-2.5">
          <button
            onClick={() => onRebook(booking)}
            className="w-full h-[48px] bg-[#e6007e] hover:bg-[#b90064] text-white font-bold text-[14px] rounded-full shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">event_repeat</span>
            Book Again
          </button>

          <div className="grid grid-cols-1 gap-2.5">
            {booking.status !== 'CANCELLED' && booking.status !== 'COMPLETED' ? (
              <button
                onClick={() => onCancel(booking)}
                className="h-[44px] rounded-full font-bold text-xs border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">cancel</span>
                Cancel
              </button>
            ) : (
              <button
                onClick={() => triggerToast('Invoice sent to your registered email address!')}
                className="h-[44px] rounded-full font-bold text-xs border border-[#e8e8e8] bg-[#fcf9f8] hover:bg-white text-[#5a3f47] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                Invoice
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
};
