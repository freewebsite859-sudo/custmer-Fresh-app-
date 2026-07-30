import React, { useState, useEffect } from 'react';
import { Salon, Service, Staff } from '../types';
import { BookingSummarySkeleton } from './Skeleton';

interface PaymentScreenProps {
  salon: Salon;
  selectedServices: Service[];
  selectedStaff: Staff | null;
  totalPrice: number;
  dateStr: string;
  timeSlot: string;
  onConfirm: () => void;
  onBack: () => void;
}

export const PaymentScreen: React.FC<PaymentScreenProps> = ({
  salon,
  selectedServices,
  selectedStaff,
  totalPrice,
  dateStr,
  timeSlot,
  onConfirm,
  onBack
}) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'summary' | 'qr' | 'processing' | 'success'>('summary');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const taxes = 50; // Mock taxes
  const finalTotal = totalPrice + taxes;
  const advanceAmount = Math.round(finalTotal * 0.25);
  const remainingAmount = finalTotal - advanceAmount;

  const handlePayAndConfirm = () => {
    if (!termsAccepted) return;
    setPaymentStep('qr');
  };

  const simulatePayment = () => {
    setPaymentStep('processing');
    setTimeout(() => {
        setPaymentStep('success');
        setTimeout(() => {
            onConfirm();
            // Reset step for potential future re-renders
            setPaymentStep('summary');
        }, 1500);
    }, 2000);
  };

  if (paymentStep === 'qr') {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen p-5 bg-white gap-6">
              <h2 className="text-[20px] font-bold text-[#26181c]">Scan QR to Pay ₹{advanceAmount}</h2>
              <div className="w-64 h-64 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300">
                  <span className="material-symbols-outlined text-[64px] text-slate-400">qr_code_2</span>
              </div>
              <button onClick={simulatePayment} className="w-full h-[52px] bg-[#e6007e] text-white rounded-xl font-semibold">
                  I have paid via QR
              </button>
          </div>
      );
  }

  if (paymentStep === 'processing') {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen p-5 bg-white">
              <span className="material-symbols-outlined text-[48px] text-[#e6007e] animate-spin">refresh</span>
              <p className="text-[16px] font-medium text-[#26181c] mt-4">Verifying payment...</p>
          </div>
      );
  }

  if (paymentStep === 'success') {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen p-5 bg-white">
              <span className="material-symbols-outlined text-[48px] text-emerald-500">check_circle</span>
              <p className="text-[16px] font-medium text-[#26181c] mt-4">Payment Successful!</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col w-full relative min-h-screen bg-[#fff8f8]">
      {/* Fixed Top Header */}
      <header className="fixed top-0 inset-x-0 z-[100] bg-white/80 backdrop-blur-2xl border-b border-[#e8e8e8]/50 pt-safe max-w-md mx-auto shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between h-16 px-5">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-11 h-11 -ml-2 flex items-center justify-center text-[#26181c] hover:bg-[#ffe8ed] rounded-full transition-colors"
              aria-label="Back"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
            <div className="flex flex-col">
              <h1 className="text-[18px] font-semibold text-[#26181c] leading-tight truncate">Review Booking</h1>
              <span className="text-[13px] font-medium text-[#8e004b]">Step 4 of 4</span>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-[#8e004b] flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[18px]">person</span>
          </div>
        </div>
      </header>

      <main className="relative w-full pt-16 pb-32 bg-[#fff8f8] min-h-screen">
        <div className="flex flex-col w-full px-5 gap-8">
          {isLoading ? (
            <div className="mt-4"><BookingSummarySkeleton /></div>
          ) : (
            <>
              {/* Order Summary Bento Grid */}
              <section className="flex flex-col gap-2 mt-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[20px] font-semibold text-[#26181c]">Booking Summary</h2>
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#fff0f3] text-[#e6007e] text-[11px] font-bold border border-[#fcd5e8]">
                <span className="material-symbols-outlined text-[14px]">timer</span>
                {selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0)} min
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              
              {/* Service Card */}
              <div className="bg-[#ffe8ed] rounded-xl p-4 flex gap-2 items-center shadow-sm">
                <div 
                  className="w-16 h-16 rounded-lg bg-[#fff8f8] flex-shrink-0 bg-cover bg-center overflow-hidden" 
                  style={{ backgroundImage: `url('${salon.image}')` }}
                ></div>
                <div className="flex flex-col flex-grow min-w-0">
                  <span className="text-[18px] font-semibold text-[#26181c] truncate">{selectedServices.map(s => s.name).join(', ')}</span>
                  {selectedStaff && (
                    <span className="text-[16px] text-[#5a3f47] truncate mt-0.5">With {selectedStaff.name}</span>
                  )}
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-2">
                {/* Date/Time */}
                <div className="bg-[#ffe8ed] rounded-xl p-4 flex flex-col justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[#8e004b] mb-1">calendar_today</span>
                  <span className="text-[13px] font-medium text-[#5a3f47]">{dateStr}</span>
                  <span className="text-[18px] font-semibold text-[#26181c] truncate">{timeSlot}</span>
                </div>
                {/* Location */}
                <div className="bg-[#ffe8ed] rounded-xl p-4 flex flex-col justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[#8e004b] mb-1">location_on</span>
                  <span className="text-[13px] font-medium text-[#5a3f47]">{salon.name}</span>
                  <span className="text-[18px] font-semibold text-[#26181c] truncate">{salon.area}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Payment Breakdown */}
          <section className="flex flex-col gap-2">
            <h2 className="text-[20px] font-semibold text-[#26181c] mb-2">Payment Details</h2>
            <div className="bg-[#ffe8ed] rounded-xl p-4 flex flex-col gap-2 shadow-sm">
              <div className="flex justify-between items-center">
                <span className="text-[16px] text-[#5a3f47]">Total Booking Amount</span>
                <span className="text-[16px] text-[#26181c]">₹{finalTotal}</span>
              </div>
              <div className="flex justify-between items-center text-[#e6007e] font-semibold">
                <span className="text-[16px]">Pay Now — 25% Advance</span>
                <span className="text-[16px]">₹{advanceAmount}</span>
              </div>
              <div className="flex justify-between items-center text-[#5a3f47]">
                <span className="text-[16px]">Pay After Service — 75%</span>
                <span className="text-[16px]">₹{remainingAmount}</span>
              </div>
            </div>
          </section>

          {/* Terms & Checkout */}
          <section className="flex flex-col gap-4 mb-8">
            <label className="flex items-start gap-3 cursor-pointer group" onClick={(e) => { e.preventDefault(); setTermsAccepted(!termsAccepted); }}>
              <div className="relative flex items-center justify-center w-6 h-6 mt-0.5">
                <div className={`w-5 h-5 rounded flex items-center justify-center transition-all shadow-sm ${termsAccepted ? 'bg-[#e6007e]' : 'bg-[#ffe8ed] border-2 border-[#e8e8e8]'}`}>
                  {termsAccepted && <span className="material-symbols-outlined text-white text-[16px] font-bold">check</span>}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[16px] text-[#26181c] select-none">
                  I agree to the <a className="text-[#e6007e] font-semibold underline decoration-[#e6007e]/30 underline-offset-2" href="#">Cancellation Policy</a> and <a className="text-[#e6007e] font-semibold underline decoration-[#e6007e]/30 underline-offset-2" href="#">Terms of Service</a>.
                </span>
              </div>
            </label>

            {/* Payment Button (Active State) */}
            <div className="flex flex-col gap-2 mt-2">
              <button 
                onClick={handlePayAndConfirm}
                disabled={!termsAccepted}
                className={`w-full h-[52px] rounded-xl font-semibold text-[18px] flex items-center justify-center gap-2 transition-transform shadow-lg ${termsAccepted ? 'bg-[#e6007e] text-white shadow-[#e6007e]/20 active:scale-[0.98]' : 'bg-[#e0bec6] text-[#5a3f47] cursor-not-allowed shadow-none'}`}
              >
                <span className="material-symbols-outlined text-[20px]">lock</span>
                Pay ₹{advanceAmount} & Confirm Booking
              </button>
              <div className="flex items-center justify-center gap-1.5 mt-1 opacity-70">
                <span className="material-symbols-outlined text-[14px] text-[#5a3f47]">verified_user</span>
                <span className="text-[12px] text-[#5a3f47]">Secure payment through Razorpay</span>
              </div>
            </div>
          </section>
            </>
          )}
        </div>
      </main>

      {!isLoading && (
        <footer className="fixed bottom-0 inset-x-0 z-[100] bg-white/95 backdrop-blur-3xl border-t border-[#e8e8e8] pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.08)] max-w-md mx-auto mb-safe">
          <div className="pt-5 pb-8 p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-medium text-[#5a3f47]">Total Amount</span>
              <span className="text-[18px] font-semibold text-[#26181c]">₹{finalTotal}</span>
            </div>
            <button 
              onClick={handlePayAndConfirm}
              disabled={!termsAccepted}
              className={`w-full h-[52px] rounded-xl font-semibold text-[18px] flex items-center justify-center gap-2 transition-transform shadow-lg ${termsAccepted ? 'bg-[#e6007e] text-white shadow-[#e6007e]/20 active:scale-[0.98]' : 'bg-[#e0bec6] text-[#5a3f47] cursor-not-allowed shadow-none'}`}
            >
              <span className="material-symbols-outlined text-[20px]">lock</span>
              Pay ₹{advanceAmount} & Confirm Booking
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
