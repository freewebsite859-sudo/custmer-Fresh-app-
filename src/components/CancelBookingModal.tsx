import React, { useState } from 'react';
import { Booking } from '../types';

interface CancelBookingModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmCancel: (bookingId: string, reason?: string) => void;
}

export const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  booking,
  isOpen,
  onClose,
  onConfirmCancel,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('Change of plans');

  if (!isOpen || !booking) return null;

  const advancePaid = Math.round(booking.totalAmount * 0.25);
  const refundAmount = Math.round(advancePaid * 0.5);

  const reasons = [
    'Change of plans',
    'Found a better price',
    'Emergency',
    'Other',
  ];

  const handleConfirm = () => {
    onConfirmCancel(booking.id, selectedReason);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop overlay listener */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Bottom Sheet Modal */}
      <div className="relative w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl p-6 border border-[#e8e8e8] z-10 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        {/* Drag Handle indicator */}
        <div className="w-12 h-1 bg-[#e0bec6] rounded-full mx-auto mb-5 sm:hidden" />

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-[#ffdad6] text-[#ba1a1a] flex items-center justify-center mb-3.5 shadow-xs">
            <span className="material-symbols-outlined text-[32px]">close</span>
          </div>
          <h2 className="text-[20px] font-bold text-[#26181c] mb-1">Cancel this booking?</h2>
          <p className="text-[14px] text-[#594047] leading-relaxed max-w-[300px]">
            Are you sure you want to cancel your appointment at{' '}
            <span className="font-bold text-[#26181c]">{booking.salonName}</span>?
          </p>
        </div>

        {/* Policy Information Card */}
        <div className="bg-[#fff0f2] p-4 rounded-[18px] border border-[#fcd5e8] flex flex-col gap-2.5 mb-5">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#8e004b] text-[20px] mt-0.5 shrink-0">
              info
            </span>
            <p className="text-[12px] text-[#594047] leading-snug font-medium">
              Cancellations made within 24 hours of the appointment are subject to a 50% cancellation fee of the advance payment.
            </p>
          </div>
          <div className="pt-2.5 border-t border-[#e0bec6]/60 flex flex-col gap-1">
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-semibold text-[#594047]">Refund Amount:</span>
              <span className="text-[17px] font-extrabold text-[#26181c]">₹{refundAmount}</span>
            </div>
            <p className="text-[11px] text-[#594047]/80 italic">
              The refund will be processed to your original payment method (Razorpay) within 5-7 business days.
            </p>
          </div>
        </div>

        {/* Reason for Cancellation */}
        <div className="mb-6">
          <label className="text-[12px] font-bold text-[#594047] block mb-2 px-1">
            Reason for cancellation (optional)
          </label>
          <div className="flex flex-wrap gap-2">
            {reasons.map((reason) => {
              const isSelected = selectedReason === reason;
              return (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setSelectedReason(reason)}
                  className={`px-3.5 py-2 rounded-full text-[12px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#e6007e] text-white shadow-xs scale-[1.02]'
                      : 'bg-[#f6dce2] text-[#594047] hover:bg-[#ffd9e2]'
                  }`}
                >
                  {reason}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-[50px] bg-[#8e004b] hover:bg-[#b90064] text-white font-bold text-[14px] rounded-2xl shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
          >
            Keep Booking
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full h-[50px] bg-transparent text-[#ba1a1a] border-2 border-[#ba1a1a] hover:bg-[#ffdad6]/30 font-bold text-[14px] rounded-2xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
          >
            Yes, Cancel Booking
          </button>
        </div>
      </div>
    </div>
  );
};
