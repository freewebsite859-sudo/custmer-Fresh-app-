import React, { useState, useEffect } from 'react';
import { InstallApp } from './InstallApp';
import { supabase } from '../lib/supabaseClient';
import {
  CustomerSettings,
  SETTINGS_DEFAULTS,
  loadSettings,
  saveSettings,
  subscribeToSettings,
} from '../lib/settingsRepository';

interface SettingsScreenProps {
  onBack: () => void;
  onNavigate: (screen: any) => void;
  onLogout?: () => void;
  customerId?: string;
  currentLocationName?: string;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onNavigate,
  onLogout,
  customerId,
  currentLocationName,
}) => {
  // Settings live in customer_settings (one row per user). Every change is
  // written to Supabase immediately and Realtime pushes it to all devices.
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

  const preferredLoc = currentLocationName?.trim() || 'Not set on this device';

  // Loading / Interaction states
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
        triggerToast('Could not sync right now — will retry on next change.');
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
    applySettings({ ...settings, display_mode: mode }, mode === 'device' ? 'Theme matched to Device setting' : 'Light Mode theme set as default');
  };

  const handleInstallApp = () => {
    setShowInstallModal(true);
  };

  const handleLogOutConfirm = () => {
    setShowLogoutModal(false);
    triggerToast('Logging out...');
    setTimeout(() => {
      if (onLogout) {
        onLogout();
      } else {
        onNavigate('welcome');
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto pb-32 animate-in fade-in duration-200">
      {/* Toast popup */}
      {toast && (
        <div className="fixed bottom-32 mb-safe inset-x-4 z-[100] bg-[#26181c] text-white px-4 py-3 rounded-xl shadow-lg border border-[#e0bec6]/30 text-xs font-semibold flex items-center gap-2 max-w-sm mx-auto animate-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-[#e6007e] text-lg">check_circle</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-[#e8e8e8] shadow-xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-50 text-[#ba1a1a] flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[24px]">logout</span>
            </div>
            <div className="text-center">
              <h3 className="font-bold text-[16px] text-on-surface">Log Out?</h3>
              <p className="text-[12px] text-[#5a3f47] mt-1.5 leading-relaxed">
                Are you sure you want to log out of your Nexora profile? You will need to verify your number again to log back in.
              </p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 h-11 bg-[#ffe8ed] text-primary font-bold text-xs rounded-xl hover:bg-[#ffd9e2] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleLogOutConfirm}
                className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Install App Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="absolute inset-0" onClick={() => setShowInstallModal(false)} />
          <div className="relative z-10 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <InstallApp 
              onClose={() => setShowInstallModal(false)}
              onInstall={() => {
                setShowInstallModal(false);
                triggerToast('Nexora app installed successfully on your home screen!');
              }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col w-full pb-safe">
        {/* Notifications Group */}
        <div className="px-page-margin-mobile pb-6 pt-2">
          <div className="text-caption text-on-surface-variant uppercase tracking-wider mb-stack-sm ml-2">Notifications</div>
          <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#e8e8e8] overflow-hidden">
            {/* Booking Updates */}
            <div
              onClick={() => handleToggle('booking_updates', 'Booking Updates')}
              className="flex items-center justify-between p-4 bg-surface-container-lowest hover:bg-slate-50/50 transition-colors touch-manipulation cursor-pointer"
            >
              <span className="text-body text-on-surface font-medium">Booking Updates</span>
              <div className="relative inline-flex items-center">
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${bookingUpdates ? 'bg-[#e6007e]' : 'bg-[#e0bec6]'} shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]`}>
                  <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-all duration-200 ${bookingUpdates ? 'translate-x-5 border-white' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>
            <div className="h-px bg-outline-subtle mx-4"></div>

            {/* Appointment Reminders */}
            <div
              onClick={() => handleToggle('appointment_reminders', 'Appointment Reminders')}
              className="flex items-center justify-between p-4 bg-surface-container-lowest hover:bg-slate-50/50 transition-colors touch-manipulation cursor-pointer"
            >
              <span className="text-body text-on-surface font-medium">Appointment Reminders</span>
              <div className="relative inline-flex items-center">
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${appointmentReminders ? 'bg-[#e6007e]' : 'bg-[#e0bec6]'} shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]`}>
                  <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-all duration-200 ${appointmentReminders ? 'translate-x-5 border-white' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>
            <div className="h-px bg-outline-subtle mx-4"></div>

            {/* Rewards Updates */}
            <div
              onClick={() => handleToggle('rewards_updates', 'Rewards Updates')}
              className="flex items-center justify-between p-4 bg-surface-container-lowest hover:bg-slate-50/50 transition-colors touch-manipulation cursor-pointer"
            >
              <span className="text-body text-on-surface font-medium">Rewards Updates</span>
              <div className="relative inline-flex items-center">
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${rewardsUpdates ? 'bg-[#e6007e]' : 'bg-[#e0bec6]'} shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]`}>
                  <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-all duration-200 ${rewardsUpdates ? 'translate-x-5 border-white' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>
            <div className="h-px bg-outline-subtle mx-4"></div>

            {/* Offers and Promotions */}
            <div
              onClick={() => handleToggle('offers_promotions', 'Offers and Promotions')}
              className="flex items-center justify-between p-4 bg-surface-container-lowest hover:bg-slate-50/50 transition-colors touch-manipulation cursor-pointer"
            >
              <span className="text-body text-on-surface font-medium">Offers and Promotions</span>
              <div className="relative inline-flex items-center">
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${offersPromo ? 'bg-[#e6007e]' : 'bg-[#e0bec6]'} shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]`}>
                  <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-all duration-200 ${offersPromo ? 'translate-x-5 border-white' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>
            <div className="h-px bg-outline-subtle mx-4"></div>

            {/* Email Notifications */}
            <div
              onClick={() => handleToggle('email_notifications', 'Email Notifications')}
              className="flex items-center justify-between p-4 bg-surface-container-lowest hover:bg-slate-50/50 transition-colors touch-manipulation cursor-pointer"
            >
              <span className="text-body text-on-surface font-medium">Email Notifications</span>
              <div className="relative inline-flex items-center">
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${emailNotifs ? 'bg-[#e6007e]' : 'bg-[#e0bec6]'} shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]`}>
                  <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-all duration-200 ${emailNotifs ? 'translate-x-5 border-white' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>
            <div className="h-px bg-outline-subtle mx-4"></div>

            {/* Push Notifications */}
            <div
              onClick={() => handleToggle('push_notifications', 'Push Notifications')}
              className="flex items-center justify-between p-4 bg-surface-container-lowest hover:bg-slate-50/50 transition-colors touch-manipulation cursor-pointer"
            >
              <span className="text-body text-on-surface font-medium">Push Notifications</span>
              <div className="relative inline-flex items-center">
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${pushNotifs ? 'bg-[#e6007e]' : 'bg-[#e0bec6]'} shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]`}>
                  <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-all duration-200 ${pushNotifs ? 'translate-x-5 border-white' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location Group */}
        <div className="px-page-margin-mobile pb-6">
          <div className="text-caption text-on-surface-variant uppercase tracking-wider mb-stack-sm ml-2">Location</div>
          <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#e8e8e8] overflow-hidden">
            <button
              type="button"
              onClick={() => onNavigate('location-modal')}
              className="w-full flex items-center justify-between p-4 bg-surface-container-lowest hover:bg-slate-50/50 transition-colors text-left cursor-pointer"
            >
              <div>
                <span className="block text-body text-on-surface font-medium">Preferred Location</span>
                <span className="block text-caption text-[#e6007e] font-bold mt-0.5">{preferredLoc}</span>
              </div>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </button>
            <div className="h-px bg-outline-subtle mx-4"></div>

            <div
              onClick={() => handleToggle('auto_location', 'Auto Location detection')}
              className="flex items-center justify-between p-4 bg-surface-container-lowest hover:bg-slate-50/50 transition-colors touch-manipulation cursor-pointer"
            >
              <span className="text-body text-on-surface font-medium">Use Location Automatically</span>
              <div className="relative inline-flex items-center">
                <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${useLocAuto ? 'bg-[#e6007e]' : 'bg-[#e0bec6]'} shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]`}>
                  <div className={`absolute top-[2px] left-[2px] bg-white border border-gray-300 rounded-full h-5 w-5 transition-all duration-200 ${useLocAuto ? 'translate-x-5 border-white' : 'translate-x-0'}`}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Language Group */}
        <div className="px-page-margin-mobile pb-6">
          <div className="text-caption text-on-surface-variant uppercase tracking-wider mb-stack-sm ml-2">Language</div>
          <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#e8e8e8] overflow-hidden flex flex-col">
            <label
              onClick={() => handleLanguageChange('english')}
              className="flex items-center justify-between p-4 cursor-pointer active:bg-slate-50 transition-colors"
            >
              <span className="text-body text-on-surface font-medium">English</span>
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors border-primary">
                {language === 'english' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
              </div>
              <input type="radio" name="language" checked={language === 'english'} readOnly className="hidden" />
            </label>
            <div className="h-px bg-outline-subtle mx-4"></div>

            <label
              onClick={() => handleLanguageChange('hindi')}
              className="flex items-center justify-between p-4 cursor-pointer active:bg-slate-50 transition-colors"
            >
              <span className="text-body text-on-surface font-medium">हिन्दी</span>
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors border-outline-variant">
                {language === 'hindi' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
              </div>
              <input type="radio" name="language" checked={language === 'hindi'} readOnly className="hidden" />
            </label>
          </div>
        </div>

        {/* Display Group */}
        <div className="px-page-margin-mobile pb-6">
          <div className="text-caption text-on-surface-variant uppercase tracking-wider mb-stack-sm ml-2">Display</div>
          <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#e8e8e8] overflow-hidden flex flex-col">
            <label
              onClick={() => handleDisplayChange('device')}
              className="flex items-center justify-between p-4 cursor-pointer active:bg-slate-50 transition-colors"
            >
              <span className="text-body text-on-surface font-medium">Use Device Setting</span>
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors border-primary">
                {displayMode === 'device' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
              </div>
              <input type="radio" name="display" checked={displayMode === 'device'} readOnly className="hidden" />
            </label>
            <div className="h-px bg-outline-subtle mx-4"></div>

            <label
              onClick={() => handleDisplayChange('light')}
              className="flex items-center justify-between p-4 cursor-pointer active:bg-slate-50 transition-colors"
            >
              <span className="text-body text-on-surface font-medium">Light Mode</span>
              <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors border-outline-variant">
                {displayMode === 'light' && <div className="w-2.5 h-2.5 bg-primary rounded-full"></div>}
              </div>
              <input type="radio" name="display" checked={displayMode === 'light'} readOnly className="hidden" />
            </label>
          </div>
        </div>

        {/* Privacy Group */}
        <div className="px-page-margin-mobile pb-6">
          <div className="text-caption text-on-surface-variant uppercase tracking-wider mb-stack-sm ml-2">Privacy</div>
          <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#e8e8e8] overflow-hidden flex flex-col">
            <button
              onClick={() => triggerToast('Location permission is currently managed by your browser settings.')}
              className="w-full flex items-center justify-between p-4 bg-surface-container-lowest active:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <div>
                <span className="block text-body text-on-surface font-medium">Location Permission</span>
                <span className="block text-caption text-on-surface-variant mt-0.5">While Using App</span>
              </div>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </button>
            <div className="h-px bg-outline-subtle mx-4"></div>

            <button
              onClick={() => triggerToast('Notification settings are managed securely by your system.')}
              className="w-full flex items-center justify-between p-4 bg-surface-container-lowest active:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <div>
                <span className="block text-body text-on-surface font-medium">Notification Permission</span>
                <span className="block text-caption text-on-surface-variant mt-0.5">Allowed</span>
              </div>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </button>
            <div className="h-px bg-outline-subtle mx-4"></div>

            <button
              onClick={() => triggerToast('Nexora encrypts all local data storage. No data is shared with third parties.')}
              className="w-full flex items-center justify-between p-4 bg-surface-container-lowest active:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <span className="text-body text-on-surface font-medium">Manage Personal Data</span>
              <span className="material-symbols-outlined text-outline">chevron_right</span>
            </button>
          </div>
        </div>

        {/* App Info Group */}
        <div className="px-page-margin-mobile pb-6">
          <div className="text-caption text-on-surface-variant uppercase tracking-wider mb-stack-sm ml-2">App Info</div>
          <div className="bg-surface-container-lowest rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-[#e8e8e8] overflow-hidden flex flex-col">
            <button
              onClick={handleInstallApp}
              className="w-full flex items-center justify-between p-4 bg-surface-container-lowest active:bg-slate-50 transition-colors text-left group cursor-pointer"
            >
              <span className="text-body text-primary font-medium group-active:opacity-80 transition-opacity">Install Nexora App</span>
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>download</span>
            </button>
            <div className="h-px bg-outline-subtle mx-4"></div>

            <button
              onClick={() => triggerToast('Nexora updates automatically in your browser — no action needed.')}
              className="w-full flex items-center justify-between p-4 bg-surface-container-lowest active:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <div>
                <span className="block text-body text-on-surface font-medium">App Updates</span>
                <span className="block text-caption text-on-surface-variant mt-0.5">Web app — updates apply automatically{cloudReady ? ' · settings synced' : ''}</span>
              </div>
              <span className="material-symbols-outlined text-outline">refresh</span>
            </button>
          </div>
        </div>

        {/* Log Out Button */}
        <div className="px-page-margin-mobile pb-12 pt-6 flex justify-center">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="text-label-md text-error font-medium px-6 py-2.5 rounded-full active:bg-error-container/50 hover:bg-red-50 transition-colors cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
};
