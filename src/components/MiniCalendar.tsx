import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface MiniCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  minDate?: Date;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  selectedDate,
  onDateChange,
  minDate = new Date(),
}) => {
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const [isExpanded, setIsExpanded] = useState(false);

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  const isPast = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const year = viewDate.getFullYear();

  // Weekly View (7 days starting from viewDate or selectedDate)
  const getWeeklyDates = () => {
    const dates = [];
    const start = new Date(selectedDate);
    // Find the Monday of the week or just show next 7 days? 
    // Usually for booking, next 7-14 days horizontal scroll is good.
    // Let's stick to a 14-day horizontal scroll for the collapsed view.
    const base = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weeklyDates = getWeeklyDates();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-[#e6007e]">calendar_month</span>
          <h3 className="text-[16px] font-bold text-[#26181c]">Select Date</h3>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[12px] font-bold text-[#e6007e] flex items-center gap-1 hover:underline cursor-pointer"
        >
          <CalendarIcon size={14} />
          {isExpanded ? 'Show Quick Bar' : 'Open Calendar View'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!isExpanded ? (
          <motion.div
            key="weekly"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1"
          >
            {weeklyDates.map((date, idx) => {
              const isSelected = isSameDay(date, selectedDate);
              const dayName = date.toLocaleString('default', { weekday: 'short' });
              const dateNum = date.getDate();
              const monthShort = date.toLocaleString('default', { month: 'short' });

              return (
                <motion.button
                  key={idx}
                  layout
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onDateChange(date)}
                  className={`px-4 py-2.5 rounded-2xl flex flex-col items-center min-w-[76px] transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#e6007e] text-white shadow-md border-[#e6007e] z-10'
                      : 'bg-white text-[#5a3f47] border-[#f0d8e2] hover:bg-[#fff0f3]'
                  }`}
                >
                  <span className={`text-[10px] uppercase font-bold ${isSelected ? 'text-white/80' : 'text-[#8c7077]'}`}>
                    {dayName}
                  </span>
                  <span className="text-[16px] font-extrabold leading-tight">{dateNum}</span>
                  <span className={`text-[9px] font-bold ${isSelected ? 'text-white/70' : 'text-[#e6007e]'}`}>
                    {monthShort}
                  </span>
                  {isSelected && (
                    <motion.div
                      layoutId="activeDate"
                      className="absolute inset-0 rounded-2xl border-2 border-white/20 pointer-events-none"
                    />
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl border border-[#f0d8e2] p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-[#26181c]">
                {monthName} {year}
              </h4>
              <div className="flex gap-1">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-[#5a3f47]"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-[#5a3f47]"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d) => (
                <span key={d} className="text-[10px] font-bold text-[#8c7077] uppercase">
                  {d}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDayOfMonth(year, viewDate.getMonth()) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth(year, viewDate.getMonth()) }).map((_, i) => {
                const day = i + 1;
                const date = new Date(year, viewDate.getMonth(), day);
                const isSelected = isSameDay(date, selectedDate);
                const disabled = isPast(date);

                return (
                  <motion.button
                    key={day}
                    layout
                    whileHover={!disabled ? { scale: 1.1, backgroundColor: isSelected ? '#e6007e' : '#fdf2f8' } : {}}
                    whileTap={!disabled ? { scale: 0.9 } : {}}
                    disabled={disabled}
                    onClick={() => onDateChange(date)}
                    className={`aspect-square rounded-xl flex items-center justify-center text-[13px] font-bold transition-all relative ${
                      isSelected
                        ? 'bg-[#e6007e] text-white shadow-sm z-10'
                        : disabled
                        ? 'text-slate-300'
                        : 'text-[#26181c] hover:text-[#e6007e]'
                    }`}
                  >
                    <span className="relative z-10">{day}</span>
                    {isSelected && (
                      <motion.div
                        layoutId="activeGridDate"
                        className="absolute inset-0 rounded-xl bg-[#e6007e] shadow-sm"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
