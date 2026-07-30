import React, { useEffect } from 'react';
import { AppNotification, Screen } from '../types';
import { playNotificationSound } from '../utils/sound';

interface NotificationOverlayProps {
  notification: AppNotification | null;
  onDismiss: () => void;
  onSnooze: (id: string) => void;
  onNavigate: (screen: Screen) => void;
}

export const NotificationOverlay: React.FC<NotificationOverlayProps> = ({
  notification,
  onDismiss,
  onSnooze,
  onNavigate,
}) => {
  useEffect(() => {
    if (notification) {
      playNotificationSound();
    }
  }, [notification]);

  if (!notification) return null;

  return (
    <div className="fixed top-[calc(env(safe-area-inset-top,0px)+80px)] left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-md animate-in slide-in-from-top-4 duration-300">
      <div className="bg-[#1f1115]/95 backdrop-blur-2xl text-white rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] border border-white/15 relative overflow-hidden">
        {/* Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-[#e6007e] to-purple-500 animate-pulse" />

        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#e6007e] flex items-center justify-center text-white text-[12px] shadow-sm font-bold">
              N
            </div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px] animate-bounce">notifications_active</span>
              Nexora Push Alert
            </span>
            <span className="text-[10px] text-white/50">• 1h Before Service</span>
          </div>

          <button
            onClick={onDismiss}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white/70 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Dismiss Push Notification"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex items-start gap-3 mt-1">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[22px]">alarm</span>
          </div>

          <div className="flex-1 pr-1">
            <h4 className="text-[15px] font-bold text-white tracking-tight leading-snug">
              Upcoming Salon Appointment
            </h4>
            <p className="text-[12px] text-amber-200 font-semibold mt-0.5">
              {notification.salonName} ({notification.timeSlot})
            </p>
            <p className="text-[11px] text-white/80 mt-0.5 leading-relaxed">
              {notification.servicesSummary}
            </p>
            <p className="text-[10px] text-white/50 mt-1">
              {notification.dateStr} • Starts in 1 Hour
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-stretch gap-2 mt-3 pt-2 border-t border-white/10">
          <button
            onClick={() => {
              onDismiss();
              onNavigate('bookings');
            }}
            className="flex-1 h-10 bg-[#e6007e] hover:bg-[#c9006e] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[15px]">event</span>
            View Booking
          </button>

          <button
            onClick={() => onSnooze(notification.id)}
            className="flex-1 h-10 bg-white/10 hover:bg-white/20 text-white/90 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">snooze</span>
            Snooze 10m
          </button>
        </div>
      </div>
    </div>
  );
};
