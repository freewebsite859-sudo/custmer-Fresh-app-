import { PaymentScreen } from "./PaymentScreen";
import React, { useState, useMemo, useEffect } from 'react';
import { Salon, Service, Staff, Booking } from '../types';

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
    appointmentStart: Date;
    staffName?: string;
    customerNote?: string;
  }) => Promise<Booking>;
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
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('');
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [customerNote, setCustomerNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  // Rolling 7-day window starting from the REAL current date (no hardcoded days).
  const dateOptions = useMemo(() => {
    const now = new Date();
    const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dateNum = String(d.getDate());
      const monthShort = d.toLocaleDateString('en-US', { month: 'short' });
      const monthYear = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { dayName, dateNum, fullDate: `${dayName} ${dateNum} ${monthShort}`, monthYear, isoDate, isToday: i === 0 && weekOffset === 0 };
    });
  }, [weekOffset]);

  // Slots derive from the salon's real opening hours (e.g. "9:00 AM – 8:00 PM"), hourly grid.
  const parseHour = (text: string): number | null => {
    const m = /(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i.exec(text || '');
    if (!m) return null;
    let h = parseInt(m[1], 10) % 12;
    if (m[3].toUpperCase() === 'PM') h += 12;
    return h * 60 + parseInt(m[2] || '0', 10);
  };
  const formatSlot = (mins: number): string => {
    const h24 = Math.floor(mins / 60);
    const mm = String(mins % 60).padStart(2, '0');
    const suffix = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return `${String(h12).padStart(2, '0')}:${mm} ${suffix}`;
  };

  const timeSlots = useMemo(() => {
    const parts = (salon.hours || '').split(/[–-]/);
    const opens = parseHour(parts[0] || '') ?? 9 * 60;
    const closes = parseHour(parts[1] || '') ?? 20 * 60;
    const buckets = {
      morning: [] as { time: string; disabled: boolean }[],
      afternoon: [] as { time: string; disabled: boolean }[],
      evening: [] as { time: string; disabled: boolean }[],
    };
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const activeIsToday = dateOptions[selectedDateIdx]?.isToday === true;
    for (let m = opens; m < closes; m += 60) {
      const entry = { time: formatSlot(m), disabled: activeIsToday && m <= nowMins };
      if (m < 12 * 60) buckets.morning.push(entry);
      else if (m < 17 * 60) buckets.afternoon.push(entry);
      else buckets.evening.push(entry);
    }
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salon.hours, dateOptions, selectedDateIdx]);

  const activeDateObj = dateOptions[selectedDateIdx] || dateOptions[0];

  // Keep the selection on an enabled slot whenever the day/hours grid changes.
  useEffect(() => {
    const all = [...timeSlots.morning, ...timeSlots.afternoon, ...timeSlots.evening];
    const current = all.find((s) => s.time === selectedTimeSlot);
    if (!current || current.disabled) {
      const firstOpen = all.find((s) => !s.disabled);
      setSelectedTimeSlot(firstOpen ? firstOpen.time : '');
    }
  }, [timeSlots, selectedTimeSlot]);

  const buildAppointmentStart = (): Date => {
    const mins = parseHour(selectedTimeSlot) ?? 0;
    const [y, mo, d] = activeDateObj.isoDate.split('-').map((p) => parseInt(p, 10));
    return new Date(y, mo - 1, d, Math.floor(mins / 60), mins % 60, 0, 0);
  };

  const handleReviewBooking = () => {
    setStep(2);
  };

  const handlePayment = async () => {
    if (isSubmitting) return;
    setSubmitError(null);
    if (!selectedTimeSlot) {
      setSubmitError('Please pick an available time slot.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onConfirmBooking({
        salon,
        services: selectedServices,
        totalAmount: totalPrice,
        dateStr: activeDateObj.fullDate,
        timeSlot: selectedTimeSlot,
        appointmentStart: buildAppointmentStart(),
        staffName: selectedStaff?.name,
        customerNote: customerNote,
      });
    } catch (err: any) {
      setSubmitError(err?.message || 'Booking could not be completed. Please try again.');
      setStep(1);
    } finally {
      setIsSubmitting(false);
    }
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
        isProcessing={isSubmitting}
        submitError={submitError}
      />
    );
  }

  return (
    <div className="flex flex-col w-full max-w-md mx-auto relative min-h-screen bg-[#fff8f8] pb-48">


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
          <h2 className="text-[18px] font-bold text-[#26181c]">{activeDateObj.monthYear}</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { if (weekOffset > 0) { setWeekOffset(weekOffset - 1); setSelectedDateIdx(0); } }}
              disabled={weekOffset === 0}
              className={`w-8 h-8 rounded-full flex items-center justify-center bg-[#ffe8ed] text-[#26181c] transition-colors ${weekOffset === 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[#f6dce2]'}`}
              aria-label="Previous week"
            >
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button
              onClick={() => { setWeekOffset(weekOffset + 1); setSelectedDateIdx(0); }}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-[#ffe8ed] text-[#26181c] hover:bg-[#f6dce2] transition-colors"
              aria-label="Next week"
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
                      disabled
                      className="h-12 rounded-xl bg-[#ffe8ed]/40 text-[#26181c]/30 font-medium text-[11px] flex items-center justify-center cursor-not-allowed"
                    >
                      <span className="line-through">{slot.time}</span>
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
                      disabled
                      className="h-12 rounded-xl bg-[#ffe8ed]/40 text-[#26181c]/30 font-medium text-[11px] flex items-center justify-center cursor-not-allowed"
                    >
                      <span className="line-through">{slot.time}</span>
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
                if (slot.disabled) {
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      disabled
                      className="h-12 rounded-xl bg-[#ffe8ed]/40 text-[#26181c]/30 font-medium text-[11px] flex items-center justify-center cursor-not-allowed"
                    >
                      <span className="line-through">{slot.time}</span>
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
        </div>
      </main>

      {/* Customer note (optional) — sent as p_customer_note with the booking */}
      <div className="px-5 pb-44 -mt-2">
        <label className="text-[13px] font-semibold text-[#5a3f47] block mb-1.5">Note for the salon (optional)</label>
        <textarea
          value={customerNote}
          onChange={(e) => setCustomerNote(e.target.value)}
          rows={2}
          placeholder="Anything the salon should know before your visit"
          className="w-full rounded-xl border border-[#f0d8e2] bg-white px-3 py-2.5 text-[13px] text-[#26181c] placeholder:text-[#8c7077] focus:outline-none focus:ring-2 focus:ring-[#e6007e]/30"
        />
      </div>

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

        {submitError && (
          <p className="text-[12px] font-medium text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">{submitError}</p>
        )}

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
