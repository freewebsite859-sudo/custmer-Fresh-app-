import { PaymentScreen } from "./PaymentScreen";
import React, { useState } from 'react';
import { Salon, Service, Staff, WaitlistEntry } from '../types';
import { WaitlistModal } from './WaitlistModal';

interface CheckoutScreenProps {
  salon: Salon;
  selectedServices: Service[];
  selectedStaff: Staff | null;
  onConfirmBooking: (bookingDetails: {
    salon: Salon;
    services: Service[];
    totalAmount: number;
    dateStr: string;
    timeSlot: string;
    staffName?: string;
    status?: 'CONFIRMED' | 'payment_pending';
    bookingId?: string;
  }, onSuccess?: () => void) => void;
  onBack: () => void;
}

export const CheckoutScreen: React.FC<CheckoutScreenProps> = ({
  salon,
  selectedServices,
  selectedStaff,
  onConfirmBooking,
  onBack,
}) => {
  const [selectedDateIdx, setSelectedDateIdx] = useState<number>(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('11:00 AM');
  const [currentMonthYear, setCurrentMonthYear] = useState<string>('July 2024');

  // Waitlist State
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState<boolean>(false);
  const [waitlistSlot, setWaitlistSlot] = useState<string>('09:00 AM');
  const [waitlistJoinedToast, setWaitlistJoinedToast] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  const handleOpenWaitlist = (slotTime: string) => {
    setWaitlistSlot(slotTime);
    setIsWaitlistModalOpen(true);
  };

  const handleWaitlistSuccess = (entry: WaitlistEntry) => {
    setWaitlistJoinedToast(`Waitlist Active: You will be notified instantly if ${entry.timeSlot} on ${entry.dateStr} opens up!`);
    setTimeout(() => {
      setWaitlistJoinedToast(null);
    }, 5000);
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  // Generate 7 days starting from Wednesday July 24
  const dateOptions = [
    { dayName: 'Wed', dateNum: '24', fullDate: 'Wed 24 Jul', isAvailable: true },
    { dayName: 'Thu', dateNum: '25', fullDate: 'Thu 25 Jul', isAvailable: true },
    { dayName: 'Fri', dateNum: '26', fullDate: 'Fri 26 Jul', isAvailable: true },
    { dayName: 'Sat', dateNum: '27', fullDate: 'Sat 27 Jul', isAvailable: true },
    { dayName: 'Sun', dateNum: '28', fullDate: 'Sun 28 Jul', isAvailable: false },
    { dayName: 'Mon', dateNum: '29', fullDate: 'Mon 29 Jul', isAvailable: true },
    { dayName: 'Tue', dateNum: '30', fullDate: 'Tue 30 Jul', isAvailable: true },
  ];

  const timeSlots = {
    morning: [
      { time: '09:00 AM', disabled: true },
      { time: '09:30 AM', disabled: true },
      { time: '10:00 AM', disabled: false },
      { time: '10:30 AM', disabled: false },
      { time: '11:00 AM', disabled: false },
      { time: '11:30 AM', disabled: false },
    ],
    afternoon: [
      { time: '12:00 PM', disabled: false },
      { time: '12:30 PM', disabled: false },
      { time: '01:00 PM', disabled: false },
      { time: '02:00 PM', disabled: false },
      { time: '03:00 PM', disabled: true },
      { time: '04:30 PM', disabled: false },
    ],
    evening: [
      { time: '05:00 PM', disabled: false },
      { time: '06:00 PM', disabled: false },
      { time: '07:00 PM', disabled: false },
    ],
  };

  const activeDateObj = dateOptions[selectedDateIdx] || dateOptions[0];

  const handleReviewBooking = () => {
    setStep(2);
  };

  const handlePayment = () => {
    // Confirm booking seamlessly
    onConfirmBooking({
      salon,
      services: selectedServices,
      totalAmount: totalPrice,
      dateStr: activeDateObj.fullDate,
      timeSlot: selectedTimeSlot,
      staffName: selectedStaff?.name,
      status: 'CONFIRMED',
    });
  };

  if (step === 2) {
    return (
      <PaymentScreen
        salon={salon}
        selectedServices={selectedServices}
        selectedStaff={selectedStaff}
        totalPrice={totalPrice}
        dateStr={activeDateObj.fullDate}
        timeSlot={selectedTimeSlot}
        onConfirm={handlePayment}
        onBack={() => setStep(1)}
      />
    );
  }

  return (
    <div className="flex flex-col w-full max-w-md mx-auto relative min-h-screen bg-[#fff8f8] pb-48">
      {/* Waitlist Modal */}
      <WaitlistModal
        isOpen={isWaitlistModalOpen}
        onClose={() => setIsWaitlistModalOpen(false)}
        salon={salon}
        timeSlot={waitlistSlot}
        dateStr={activeDateObj.fullDate}
        selectedServicesSummary={selectedServices.map((s) => s.name).join(', ')}
        onJoinSuccess={handleWaitlistSuccess}
      />

      {/* Waitlist Toast */}
      {waitlistJoinedToast && (
        <div className="fixed top-18 inset-x-4 z-50 bg-[#26181c] text-white p-3.5 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center justify-between gap-3 animate-in slide-in-from-top max-w-md mx-auto">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-amber-400 text-[22px] shrink-0">
              notifications_active
            </span>
            <p className="text-xs font-semibold">{waitlistJoinedToast}</p>
          </div>
          <button
            onClick={() => setWaitlistJoinedToast(null)}
            className="text-slate-400 hover:text-white p-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {/* Fixed Top Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-[#e8e8e8]/50 pt-safe max-w-md mx-auto">
        <div className="flex items-center h-16 px-4 gap-1">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center text-[#26181c] hover:text-[#e6007e] transition-colors"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
          </button>
          <h1 className="text-[18px] font-semibold text-[#26181c]">Checkout</h1>
        </div>
      </header>

      <main className="pt-16 flex-1 flex flex-col">
        {/* Progress Indicator Steps */}
        <div className="px-5 py-4 bg-white border-b border-[#fce2e7]">
          <div className="flex justify-between items-center relative z-10 mb-2">
            <div className="w-8 h-8 rounded-full bg-[#e6007e] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <span className="material-symbols-outlined text-[16px]">check</span>
            </div>
            <div className="flex-1 h-1 bg-[#e6007e] mx-2 rounded-full" />
            <div className="w-8 h-8 rounded-full bg-[#e6007e] text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <span className="material-symbols-outlined text-[16px]">check</span>
            </div>
            <div className="flex-1 h-1 bg-[#e6007e] mx-2 rounded-full" />
            <div className="w-8 h-8 rounded-full bg-[#8e004b] text-white flex items-center justify-center font-bold text-xs ring-4 ring-[#8e004b]/20">
              3
            </div>
          </div>
          <div className="flex justify-between items-center text-[12px] text-[#5a3f47] font-medium px-1">
            <span>Service</span>
            <span>Staff</span>
            <span className="text-[#8e004b] font-bold">Choose Time</span>
          </div>
        </div>

        {/* Month Header */}
        <div className="px-5 py-4 flex justify-between items-center bg-[#fff8f8]">
          <h2 className="text-[18px] font-bold text-[#26181c]">{currentMonthYear}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonthYear('June 2024')}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#ffe8ed] text-[#26181c] hover:bg-[#f6dce2] transition-colors"
              aria-label="Previous Month"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              onClick={() => setCurrentMonthYear('August 2024')}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#ffe8ed] text-[#26181c] hover:bg-[#f6dce2] transition-colors"
              aria-label="Next Month"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Date Horizontal Selector */}
        <div className="overflow-x-auto hide-scrollbar pb-4 px-5">
          <div className="flex gap-3 w-max">
            {dateOptions.map((item, idx) => {
              const isSelected = selectedDateIdx === idx;
              if (!item.isAvailable) {
                return (
                  <button
                    key={idx}
                    disabled
                    className="flex flex-col items-center justify-center w-16 h-20 rounded-2xl bg-[#ffe8ed]/40 text-[#26181c]/30 cursor-not-allowed"
                  >
                    <span className="text-[11px] uppercase tracking-wider font-medium">{item.dayName}</span>
                    <span className="text-[20px] font-bold mt-1">{item.dateNum}</span>
                  </button>
                );
              }

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDateIdx(idx)}
                  className={`flex flex-col items-center justify-center w-16 h-20 rounded-2xl transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-[#8e004b] text-white shadow-lg shadow-[#8e004b]/20 scale-105 font-bold'
                      : 'bg-[#ffe8ed] text-[#26181c] hover:bg-[#fce2e7]'
                  }`}
                >
                  <span className={`text-[11px] uppercase tracking-wider ${isSelected ? 'opacity-90' : 'text-[#5a3f47]'}`}>
                    {item.dayName}
                  </span>
                  <span className="text-[20px] font-bold mt-1">{item.dateNum}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Slots Section */}
        <div className="px-5 py-6 bg-[#fcf9f8] rounded-t-[28px] shadow-[0_-4px_24px_rgba(0,0,0,0.03)] flex-1">
          {/* Morning */}
          <div className="mb-6">
            <h3 className="text-[15px] font-semibold text-[#5a3f47] flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px] text-amber-500">light_mode</span> Morning
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {timeSlots.morning.map((slot) => {
                const isSelected = selectedTimeSlot === slot.time;
                if (slot.disabled) {
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => handleOpenWaitlist(slot.time)}
                      className="h-12 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-2xs group"
                    >
                      <span className="line-through opacity-60 text-[10px]">{slot.time}</span>
                      <span className="flex items-center gap-0.5 text-amber-700 group-hover:text-amber-900 font-extrabold text-[10px]">
                        <span className="material-symbols-outlined text-[12px]">notifications_active</span>
                        Waitlist
                      </span>
                    </button>
                  );
                }
                return (
                  <button
                    key={slot.time}
                    onClick={() => setSelectedTimeSlot(slot.time)}
                    className={`h-12 rounded-xl text-[14px] font-medium shadow-sm transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#8e004b] text-white font-bold ring-2 ring-[#8e004b] ring-offset-2 ring-offset-[#fcf9f8] scale-105 shadow-md'
                        : 'bg-white text-[#26181c] hover:bg-[#fde7f3] hover:text-[#e6007e]'
                    }`}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Afternoon */}
          <div className="mb-6">
            <h3 className="text-[15px] font-semibold text-[#5a3f47] flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px] text-orange-500">wb_sunny</span> Afternoon
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {timeSlots.afternoon.map((slot) => {
                const isSelected = selectedTimeSlot === slot.time;
                if (slot.disabled) {
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => handleOpenWaitlist(slot.time)}
                      className="h-12 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] flex flex-col items-center justify-center cursor-pointer transition-all active:scale-95 shadow-2xs group"
                    >
                      <span className="line-through opacity-60 text-[10px]">{slot.time}</span>
                      <span className="flex items-center gap-0.5 text-amber-700 group-hover:text-amber-900 font-extrabold text-[10px]">
                        <span className="material-symbols-outlined text-[12px]">notifications_active</span>
                        Waitlist
                      </span>
                    </button>
                  );
                }
                return (
                  <button
                    key={slot.time}
                    onClick={() => setSelectedTimeSlot(slot.time)}
                    className={`h-12 rounded-xl text-[14px] font-medium shadow-sm transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#8e004b] text-white font-bold ring-2 ring-[#8e004b] ring-offset-2 ring-offset-[#fcf9f8] scale-105 shadow-md'
                        : 'bg-white text-[#26181c] hover:bg-[#fde7f3] hover:text-[#e6007e]'
                    }`}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evening */}
          <div className="mb-6">
            <h3 className="text-[15px] font-semibold text-[#5a3f47] flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[20px] text-indigo-500">bedtime</span> Evening
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {timeSlots.evening.map((slot) => {
                const isSelected = selectedTimeSlot === slot.time;
                return (
                  <button
                    key={slot.time}
                    onClick={() => setSelectedTimeSlot(slot.time)}
                    className={`h-12 rounded-xl text-[14px] font-medium shadow-sm transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-[#8e004b] text-white font-bold ring-2 ring-[#8e004b] ring-offset-2 ring-offset-[#fcf9f8] scale-105 shadow-md'
                        : 'bg-white text-[#26181c] hover:bg-[#fde7f3] hover:text-[#e6007e]'
                    }`}
                  >
                    {slot.time}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Bottom Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 pt-5 pb-8 p-5 bg-white/95 backdrop-blur-3xl shadow-[0_-12px_40px_rgba(0,0,0,0.08)] pb-safe z-40 max-w-md mx-auto border-t border-[#e8e8e8] mb-safe">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <p className="text-[12px] text-[#5a3f47] font-medium flex items-center gap-1">
              Selected Time
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#fff0f3] text-[#e6007e] text-[9px] font-bold border border-[#fcd5e8]">
                <span className="material-symbols-outlined text-[12px]">timer</span>
                {selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0)} min
              </span>
            </p>
            <p className="text-[16px] text-[#26181c] font-bold">
              {activeDateObj.fullDate}, {selectedTimeSlot}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-[#5a3f47] font-medium">Total Payable</p>
            <p className="text-[18px] text-[#e6007e] font-bold">₹{totalPrice}</p>
          </div>
        </div>

        <button
          onClick={handleReviewBooking}
          className="w-full h-[52px] bg-[#8e004b] text-white rounded-xl font-semibold text-[15px] shadow-lg hover:bg-[#e6007e] transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          Book Now
          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};
