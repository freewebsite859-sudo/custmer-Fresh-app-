import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, CheckCircle2, WifiOff, Wifi, X } from 'lucide-react';
import { Booking } from '../types';

interface OfflineDashboardCardProps {
  booking: Booking;
  onClose?: () => void;
}

export const OfflineDashboardCard: React.FC<OfflineDashboardCardProps> = ({ booking, onClose }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[28px] p-5 border border-[#f0f0f0] shadow-sm relative overflow-hidden group"
    >
      {/* Close Button and Status Badge Container */}
      <div className="absolute top-0 right-0 z-20 flex items-center">
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 mr-1 text-[#8c7077] hover:text-[#e6007e] hover:bg-[#fff0f2] rounded-full transition-colors active:scale-90"
            aria-label="Dismiss notification"
            title="Dismiss"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        )}
        <div className={`
          flex items-center gap-1.5 px-3.5 py-2
          ${isOnline ? 'bg-[#f8fafc] text-[#64748b] border-l border-b border-[#f1f5f9]' : 'bg-amber-50 text-amber-700 border-l border-b border-amber-100'} 
          rounded-bl-2xl text-[10px] font-extrabold tracking-tight transition-all duration-300
        `}>
          {isOnline ? <Wifi size={11} strokeWidth={2.5} /> : <WifiOff size={11} strokeWidth={2.5} />}
          <span className="uppercase">{isOnline ? 'Offline Ready' : 'Cached Mode'}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Status Icon Indicator */}
        <div className="w-14 h-14 rounded-2xl bg-[#fff0f6] flex items-center justify-center text-[#e6007e] shrink-0 shadow-sm border border-[#fff5f9]">
          <CheckCircle2 size={28} strokeWidth={2} />
        </div>
        
        <div className="flex-1 min-w-0 w-full">
          {/* Header Section: Title and Location */}
          <div className="pr-24 sm:pr-0"> {/* Ensuring space for the badge on mobile */}
            <h3 className="font-extrabold text-[18px] text-[#26181c] truncate leading-tight tracking-tight">
              {booking.salonName}
            </h3>
            <div className="flex items-center gap-1.5 mt-2 text-[13px] text-[#5a3f47]">
              <MapPin size={13} className="text-[#e6007e] shrink-0" />
              <span className="truncate font-medium">{booking.locationArea}</span>
            </div>
          </div>
          
          {/* Custom Horizontal Divider */}
          <div className="h-[1px] w-full bg-[#f1f5f9] my-4" />
          
          {/* Bottom Section: Date, Time, and Services */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-[13px] text-[#26181c] font-bold">
                <Calendar size={15} className="text-[#e6007e] shrink-0" />
                <span className="tabular-nums">{booking.dateStr}</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-[#f1f5f9] shrink-0" />
              <div className="flex items-center gap-2 text-[13px] text-[#26181c] font-bold">
                <Clock size={15} className="text-[#e6007e] shrink-0" />
                <span className="tabular-nums">{booking.timeSlot}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {booking.services.slice(0, 2).map((service, idx) => (
                <div 
                  key={idx}
                  className="px-2.5 py-1 bg-[#fff0f6] text-[#e6007e] rounded-lg text-[10px] font-bold border border-[#fee2ef] whitespace-nowrap uppercase tracking-wider"
                >
                  {service.name}
                </div>
              ))}
              {booking.services.length > 2 && (
                <div className="px-2.5 py-1 bg-gray-50 text-[#64748b] rounded-lg text-[10px] font-bold border border-gray-100 whitespace-nowrap">
                  +{booking.services.length - 2} more
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
