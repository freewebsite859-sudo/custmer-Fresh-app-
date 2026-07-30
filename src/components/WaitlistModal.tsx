import React, { useState } from 'react';
import { Salon, WaitlistEntry } from '../types';

interface WaitlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  salon: Salon;
  timeSlot: string;
  dateStr: string;
  selectedServicesSummary?: string;
  onJoinSuccess: (entry: WaitlistEntry) => void;
}

export const WaitlistModal: React.FC<WaitlistModalProps> = ({
  isOpen,
  onClose,
  salon,
  timeSlot,
  dateStr,
  selectedServicesSummary,
  onJoinSuccess,
}) => {
  const [clientName, setClientName] = useState(() => localStorage.getItem('profile_name') || 'Priya Sharma');
  const [clientPhone, setClientPhone] = useState(() => localStorage.getItem('profile_phone') || '+91 98765 43210');
  const [notifPref, setNotifPref] = useState<'sms' | 'push' | 'both'>('both');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [joinedEntry, setJoinedEntry] = useState<WaitlistEntry | null>(null);

  if (!isOpen) return null;

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      const newEntry: WaitlistEntry = {
        id: `wl-${Date.now()}`,
        salonId: salon.id,
        salonName: salon.name,
        serviceNames: selectedServicesSummary ? [selectedServicesSummary] : ['General Treatment'],
        dateStr,
        timeSlot,
        clientName: clientName.trim() || 'Client',
        clientPhone: clientPhone.trim() || '+91 98765 43210',
        notificationPreference: notifPref,
        createdAt: Date.now(),
        position: Math.floor(Math.random() * 2) + 1,
        status: 'ACTIVE',
      };

      setJoinedEntry(newEntry);
      setIsSubmitting(false);
      onJoinSuccess(newEntry);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-t-[28px] sm:rounded-[28px] p-5 shadow-2xl border border-[#f0d8e2] overflow-hidden animate-in slide-in-from-bottom duration-300 relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#f3e1e8]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-300">
              <span className="material-symbols-outlined text-[22px]">event_busy</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-[16px] font-bold text-[#26181c]">No slots available</h3>
                <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                  Waitlist Open
                </span>
              </div>
              <p className="text-[11px] text-[#5a3f47] truncate max-w-[200px]">{salon.name}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer"
            aria-label="Close modal"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {joinedEntry ? (
          /* SUCCESS JOINED VIEW */
          <div className="py-6 flex flex-col items-center text-center gap-3 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs border-2 border-emerald-300">
              <span className="material-symbols-outlined text-[32px]">notifications_active</span>
            </div>

            <div>
              <h4 className="text-[18px] font-extrabold text-[#26181c]">You're on the Waitlist!</h4>
              <p className="text-xs text-[#5a3f47] max-w-[280px] mt-1">
                You are <strong>#{joinedEntry.position} in line</strong> for <strong>{joinedEntry.timeSlot}</strong> on <strong>{joinedEntry.dateStr}</strong>.
              </p>
            </div>

            <div className="w-full bg-[#fff0f3] p-3.5 rounded-2xl border border-[#fcd5e8] text-left text-xs space-y-1.5 my-1">
              <div className="flex justify-between text-[#26181c]">
                <span className="text-[#8c7077]">Salon:</span>
                <span className="font-bold">{joinedEntry.salonName}</span>
              </div>
              <div className="flex justify-between text-[#26181c]">
                <span className="text-[#8c7077]">Alert Channel:</span>
                <span className="font-bold uppercase text-[#e6007e]">{joinedEntry.notificationPreference}</span>
              </div>
              <div className="flex justify-between text-[#26181c]">
                <span className="text-[#8c7077]">Contact:</span>
                <span className="font-bold">{joinedEntry.clientPhone}</span>
              </div>
            </div>

            <p className="text-[11px] text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[15px]">bolt</span>
              If a client cancels, you will get an instant notification to claim this slot!
            </p>

            <button
              onClick={onClose}
              className="w-full py-3 bg-[#e6007e] hover:bg-[#c9006e] text-white font-bold text-xs rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer mt-2"
            >
              Done & Return to Salon
            </button>
          </div>
        ) : (
          /* FORM TO JOIN WAITLIST */
          <form onSubmit={handleJoin} className="mt-4 flex flex-col gap-4">
            {/* Slot Details Banner */}
            <div className="bg-gradient-to-r from-amber-50 to-[#fff0f3] p-3.5 rounded-2xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-extrabold text-amber-800 tracking-wider">
                  Requested Slot
                </span>
                <h4 className="text-sm font-extrabold text-[#26181c]">
                  {dateStr} • {timeSlot}
                </h4>
                {selectedServicesSummary && (
                  <p className="text-[11px] text-[#5a3f47] truncate max-w-[200px]">
                    {selectedServicesSummary}
                  </p>
                )}
              </div>
              <div className="bg-amber-500 text-white font-bold text-xs px-2.5 py-1 rounded-xl shadow-xs shrink-0 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Filled
              </div>
            </div>

            {/* Live Probability Insight */}
            <div className="flex items-center gap-2 bg-[#f8eff3] p-2.5 rounded-xl border border-[#ebd2de] text-[11px]">
              <span className="material-symbols-outlined text-[#e6007e] text-[18px] shrink-0">insights</span>
              <span className="text-[#5a3f47]">
                <strong className="text-[#26181c]">High Opening Odds:</strong> 82% of clients on waitlists receive slot opening alerts within 3 hours.
              </span>
            </div>

            {/* Name Input */}
            <div>
              <label className="text-xs font-bold text-[#26181c] block mb-1">
                Your Name
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full p-2.5 bg-[#fff8fa] border border-[#f3d3e2] rounded-xl text-xs text-[#26181c] font-medium focus:outline-none focus:ring-2 focus:ring-[#e6007e]/50"
              />
            </div>

            {/* Mobile Number for SMS */}
            <div>
              <label className="text-xs font-bold text-[#26181c] block mb-1">
                Phone Number (for Instant SMS Alert)
              </label>
              <input
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full p-2.5 bg-[#fff8fa] border border-[#f3d3e2] rounded-xl text-xs text-[#26181c] font-medium focus:outline-none focus:ring-2 focus:ring-[#e6007e]/50"
              />
            </div>

            {/* Notification Channel Preference */}
            <div>
              <label className="text-xs font-bold text-[#26181c] block mb-1.5">
                How should we notify you?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setNotifPref('push')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    notifPref === 'push'
                      ? 'bg-[#e6007e] text-white border-[#e6007e] shadow-2xs font-bold'
                      : 'bg-white text-[#5a3f47] border-[#f0d8e2] hover:bg-[#fff0f3]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] block mx-auto mb-0.5">notifications</span>
                  <span className="text-[10px] block">App Push</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifPref('sms')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    notifPref === 'sms'
                      ? 'bg-[#e6007e] text-white border-[#e6007e] shadow-2xs font-bold'
                      : 'bg-white text-[#5a3f47] border-[#f0d8e2] hover:bg-[#fff0f3]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] block mx-auto mb-0.5">sms</span>
                  <span className="text-[10px] block">SMS Alert</span>
                </button>

                <button
                  type="button"
                  onClick={() => setNotifPref('both')}
                  className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                    notifPref === 'both'
                      ? 'bg-[#e6007e] text-white border-[#e6007e] shadow-2xs font-bold'
                      : 'bg-white text-[#5a3f47] border-[#f0d8e2] hover:bg-[#fff0f3]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px] block mx-auto mb-0.5">bolt</span>
                  <span className="text-[10px] block">Both (Fast)</span>
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#f3e1e8]">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2.5 bg-[#e6007e] hover:bg-[#c9006e] text-white text-xs font-bold rounded-xl transition-colors shadow-xs active:scale-95 cursor-pointer flex items-center justify-center gap-1"
              >
                {isSubmitting ? (
                  <span className="animate-pulse">Joining...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">notifications_active</span>
                    Join Waitlist
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
