import React, { useState, useEffect } from 'react';
import { InstallApp } from './InstallApp';
import { supabase } from '../lib/supabaseClient';
import type { CustomerProfile } from '../lib/profileRepository';
import {
  CustomerSettings,
  SETTINGS_DEFAULTS,
  loadSettings,
  saveSettings,
  subscribeToSettings,
} from '../lib/settingsRepository';

interface SettingsScreenProps {
  profile: CustomerProfile | null;
  onBack: () => void;
  onNavigate: (screen: any) => void;
  onLogout?: () => void;
  customerId?: string;
  currentLocationName?: string;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  profile,
  onBack,
  onNavigate,
  onLogout,
  customerId,
  currentLocationName,
}) => {
  const [settings, setSettings] = useState<CustomerSettings>(SETTINGS_DEFAULTS);
  const [cloudReady, setCloudReady] = useState(false);

  const {
    booking_updates: bookingUpdates,
    appointment_reminders: appointmentReminders,
    rewards_updates: rewardsUpdates,
    offers_promotions: offersPromo,
    email_notifications: emailNotifs,
    push_notifications: pushNotifs,
    auto_location: useLocAuto,
    language,
    display_mode: displayMode,
  } = settings;

  const preferredLoc = currentLocationName?.trim() || profile?.preferred_area || 'Jaipur';

  const [toast, setToast] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!supabase || !customerId) return;
    let active = true;
    loadSettings(supabase, customerId)
      .then(({ settings: loaded }) => {
        if (active) {
          setSettings(loaded);
          setCloudReady(true);
        }
      })
      .catch((e) => console.warn('Settings load notice:', e?.message || e));
    const unsubscribe = subscribeToSettings(supabase, customerId, (remote) => {
      setSettings(remote);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [customerId]);

  const applySettings = (next: CustomerSettings, toastMsg: string) => {
    setSettings(next);
    triggerToast(toastMsg);
    if (supabase && customerId) {
      saveSettings(supabase, customerId, next).catch((e) => {
        console.warn('Settings save notice:', e?.message || e);
        triggerToast('Could not sync right now.');
      });
    }
  };

  const handleToggle = (field: keyof CustomerSettings, label: string) => {
    const current = settings[field];
    if (typeof current !== 'boolean') return;
    applySettings({ ...settings, [field]: !current }, `${label} is now ${!current ? 'enabled' : 'disabled'}`);
  };

  const handleLanguageChange = (lang: string) => {
    applySettings({ ...settings, language: lang }, lang === 'english' ? 'Language set to English' : 'भाषा हिन्दी में बदली गई');
  };

  const handleDisplayChange = (mode: CustomerSettings['display_mode']) => {
    applySettings({ ...settings, display_mode: mode }, mode === 'device' ? 'Theme matched to Device' : 'Theme updated');
  };

  const handleInstallApp = () => setShowInstallModal(true);

  const handleLogOutConfirm = () => {
    setShowLogoutModal(false);
    triggerToast('Logging out...');
    setTimeout(() => { if (onLogout) onLogout(); else onNavigate('welcome'); }, 1000);
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-32 animate-in fade-in duration-200">
      {toast && (
        <div className="fixed bottom-32 mb-safe inset-x-4 z-[100] bg-[#26181c] text-white px-4 py-3 rounded-xl shadow-lg border border-[#e0bec6]/30 text-xs font-semibold flex items-center gap-2 max-w-sm mx-auto animate-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-[#e6007e] text-lg">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"><div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#e8e8e8] shadow-xl flex flex-col gap-4"><div className="w-12 h-12 rounded-full bg-red-50 text-[#ba1a1a] flex items-center justify-center mx-auto"><span className="material-symbols-outlined text-[24px]">logout</span></div><div className="text-center"><h3 className="font-bold text-[16px]">Log Out?</h3><p className="text-[12px] text-[#5a3f47] mt-1.5">Are you sure you want to log out of your profile?</p></div><div className="flex gap-3 mt-2"><button onClick={() => setShowLogoutModal(false)} className="flex-1 h-11 bg-[#ffe8ed] text-primary font-bold text-xs rounded-xl">Cancel</button><button onClick={handleLogOutConfirm} className="flex-1 h-11 bg-red-600 text-white font-bold text-xs rounded-xl">Log Out</button></div></div></div>
      )}

      {showInstallModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"><div className="absolute inset-0" onClick={() => setShowInstallModal(false)} /><div className="relative z-10 w-full max-w-sm"><InstallApp onClose={() => setShowInstallModal(false)} onInstall={() => { setShowInstallModal(false); triggerToast('Installed!'); }} /></div></div>
      )}

      <div className="flex flex-col w-full pb-safe px-4 pt-4">
        <div className="text-caption text-on-surface-variant uppercase tracking-wider mb-2 ml-2">Notifications</div>
        <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden mb-6">
          <div onClick={() => handleToggle('booking_updates', 'Booking Updates')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"><span className="text-body font-medium">Booking Updates</span><div className={`w-11 h-6 rounded-full transition-colors relative ${bookingUpdates ? 'bg-[#e6007e]' : 'bg-[#e0bec6]'}`}><div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-all ${bookingUpdates ? 'translate-x-5' : ''}`}></div></div></div>
          <div className="h-px bg-[#e8e8e8] mx-4"></div>
          <div onClick={() => handleToggle('appointment_reminders', 'Appointment Reminders')} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"><span className="text-body font-medium">Appointment Reminders</span><div className={`w-11 h-6 rounded-full transition-colors relative ${appointmentReminders ? 'bg-[#e6007e]' : 'bg-[#e0bec6]'}`}><div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-all ${appointmentReminders ? 'translate-x-5' : ''}`}></div></div></div>
        </div>

        <div className="text-caption text-on-surface-variant uppercase tracking-wider mb-2 ml-2">Location</div>
        <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden mb-6">
          <button type="button" onClick={() => onNavigate('location-modal')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"><div><span className="block text-body font-medium">Preferred Location</span><span className="block text-caption text-[#e6007e] font-bold mt-0.5">{preferredLoc}</span></div><span className="material-symbols-outlined text-outline">chevron_right</span></button>
        </div>

        <div className="text-caption text-on-surface-variant uppercase tracking-wider mb-2 ml-2">App Info</div>
        <div className="bg-white rounded-xl border border-[#e8e8e8] overflow-hidden mb-12">
          <button onClick={handleInstallApp} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors text-primary font-medium">Install Nexora App<span className="material-symbols-outlined">download</span></button>
          <div className="h-px bg-[#e8e8e8] mx-4"></div>
          <button onClick={() => triggerToast('Nexora updates automatically.')} className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"><div><span className="block text-body font-medium">App Updates</span><span className="block text-caption mt-0.5">Web app — updates apply automatically</span></div><span className="material-symbols-outlined text-outline">refresh</span></button>
        </div>

        <div className="flex justify-center"><button onClick={() => setShowLogoutModal(true)} className="text-red-600 font-medium px-6 py-2.5 rounded-full hover:bg-red-50 transition-colors">Log Out</button></div>
      </div>
    </div>
  );
};
