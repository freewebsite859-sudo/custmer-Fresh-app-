import React, { useState } from 'react';
import { AppNotification, Booking, Screen } from '../types';

interface NotificationDrawerProps {
  notifications: AppNotification[];
  bookings: Booking[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onTriggerTestNotification: (bookingId?: string) => void;
  onNavigate: (screen: Screen) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  notifications,
  bookings,
  isOpen,
  onClose,
  onMarkAllAsRead,
  onClearAll,
  onTriggerTestNotification,
  onNavigate,
}) => {
  const [permissionState, setPermissionState] = useState<string>(() => {
    return typeof Notification !== 'undefined' ? Notification.permission : 'default';
  });

  if (!isOpen) return null;

  const requestBrowserPermission = async () => {
    if (typeof Notification !== 'undefined') {
      try {
        const perm = await Notification.requestPermission();
        setPermissionState(perm);
      } catch (e) {
        console.error('Permission request failed', e);
      }
    }
  };

  const activeBookings = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING');

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[28px] sm:rounded-[28px] max-h-[85vh] flex flex-col shadow-2xl border border-[#f0d8e2] overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header */}
        <div className="p-5 border-b border-[#f3e1e8] flex items-center justify-between bg-[#fff8fa]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#fde7f3] flex items-center justify-center text-[#e6007e]">
              <span className="material-symbols-outlined text-[20px]">notifications_active</span>
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[#26181c]">Appointment Reminders</h3>
              <p className="text-[11px] text-[#5a3f47]">1-Hour Push Alerts & System Updates</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
            aria-label="Close Notification Drawer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">

          {/* Browser Push Permission & Quick Test Controls */}
          <div className="bg-gradient-to-r from-[#fff0f3] to-[#fde7f3] rounded-2xl p-4 border border-[#fcd5e8] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#e6007e] text-[18px]">cell_tower</span>
                <span className="text-xs font-bold text-[#26181c]">Browser Push Permissions</span>
              </div>
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                  permissionState === 'granted'
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {permissionState === 'granted' ? 'Enabled' : 'Click to Enable'}
              </span>
            </div>

            <p className="text-[11px] text-[#5a3f47] leading-relaxed">
              Enable native browser notifications to receive an automatic alert 1 hour before your salon appointment starts.
            </p>

            {permissionState !== 'granted' && (
              <button
                onClick={requestBrowserPermission}
                className="w-full py-2 bg-[#e6007e] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#c9006e] transition-colors cursor-pointer"
              >
                Allow Push Notifications
              </button>
            )}

            {/* Test 1-Hour Push Trigger */}
            <div className="pt-2 border-t border-[#f3d3e2] flex items-center justify-between">
              <span className="text-[11px] text-[#5a3f47] font-semibold">Test 1-Hour Push System:</span>
              <button
                onClick={() => onTriggerTestNotification()}
                className="px-3 py-1.5 bg-white text-[#e6007e] border border-[#e6007e]/40 rounded-xl text-xs font-bold shadow-2xs hover:bg-[#fff0f3] transition-colors cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">notifications_paused</span>
                Test 1-Hour Push Alert
              </button>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#26181c]">
              Recent Alerts ({notifications.length})
            </span>
            <div className="flex gap-3">
              {notifications.some((n) => !n.read) && (
                <button
                  onClick={onMarkAllAsRead}
                  className="text-[#e6007e] font-semibold hover:underline cursor-pointer"
                >
                  Mark all as read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="text-[#8c7077] font-semibold hover:underline cursor-pointer"
                >
                  Clear history
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          {notifications.length > 0 ? (
            <div className="space-y-2.5">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    onClose();
                    onNavigate('bookings');
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                    !n.read
                      ? 'bg-[#fff5f8] border-[#e6007e]/30 shadow-xs'
                      : 'bg-white border-slate-200 opacity-80 hover:opacity-100'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-[20px]">
                      {n.type === 'reminder_1h' ? 'alarm' : 'check_circle'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="text-xs font-bold text-[#26181c] truncate">
                        {n.salonName}
                      </h4>
                      <span className="text-[10px] text-[#8c7077] shrink-0">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5a3f47] line-clamp-2">{n.message}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 bg-[#fde7f3] text-[#e6007e] rounded-md">
                        1h Reminder
                      </span>
                      <span className="text-[10px] text-[#e6007e] font-bold hover:underline">
                        View Details →
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center flex flex-col items-center justify-center gap-2 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200">
              <span className="material-symbols-outlined text-[36px] text-slate-300">notifications_none</span>
              <p className="text-xs font-bold text-[#26181c]">No Notifications Yet</p>
              <p className="text-[11px] text-[#5a3f47] max-w-[220px]">
                You'll automatically receive a push notification 1 hour before your booked appointments.
              </p>
              {activeBookings.length > 0 && (
                <button
                  onClick={() => onTriggerTestNotification()}
                  className="mt-2 px-3.5 py-1.5 bg-[#e6007e] text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Simulate Upcoming Alert
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#f3e1e8] bg-[#fff8fa] text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
