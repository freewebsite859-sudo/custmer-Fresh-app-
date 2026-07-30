import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Screen } from '../types';
import { LOGO_URL, AVATAR_URL } from '../data/mockData';

import { OfflineSyncStatus } from './OfflineSyncStatus';

interface HeaderProps {
  currentScreen: Screen;
  title?: string;
  onNavigate: (screen: Screen) => void;
  onBack?: () => void;
  showBack?: boolean;
  unreadNotificationCount?: number;
  onOpenNotifications?: () => void;
  onOpenQrScanner?: () => void;
  userAvatar?: string;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentScreen,
  title = 'Home',
  onNavigate,
  onBack,
  showBack = false,
  unreadNotificationCount = 0,
  onOpenNotifications,
  onOpenQrScanner,
  userAvatar,
  isSyncing = false,
}) => {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/85 backdrop-blur-2xl border-b border-[#e8e8e8]/50 pt-safe">
      <div className="flex items-center justify-between h-16 px-4 max-w-md mx-auto">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {showBack && (
            <button
              onClick={onBack}
              aria-label="Back"
              className="w-9 h-9 -ml-1 flex items-center justify-center text-[#26181c] hover:text-[#e6007e] transition-colors active:scale-95 shrink-0"
            >
              <span className="material-symbols-outlined text-[22px]">arrow_back_ios_new</span>
            </button>
          )}

          {currentScreen === 'home' && !showBack ? (
            <div className="flex items-center gap-2 overflow-hidden">
              <img
                src={LOGO_URL}
                alt="Nexora Brand Logo"
                className="h-9 w-auto object-contain shrink-0"
              />
              <div className="flex flex-col overflow-hidden">
                {title && (
                  <span className="font-semibold text-[17px] text-[#26181c] tracking-tight leading-tight truncate">
                    {title}
                  </span>
                )}
                <OfflineSyncStatus isSyncing={isSyncing} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col overflow-hidden">
              <h1 className="font-semibold text-[17px] text-[#26181c] tracking-tight truncate max-w-[130px] sm:max-w-[180px] leading-tight">
                {title}
              </h1>
              <OfflineSyncStatus isSyncing={isSyncing} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 header-nav-container">
          {/* Header Scan UPI QR Code Button */}
          {onOpenQrScanner && (
            <button
              onClick={onOpenQrScanner}
              className="h-9 px-2.5 rounded-full bg-[#fde7f3] hover:bg-[#ffd9e2] text-[#e6007e] flex items-center gap-1 font-bold text-[11px] transition-all active:scale-95 cursor-pointer border border-[#e0bec6]/40 shrink-0"
              aria-label="Scan UPI QR Code"
              title="Scan UPI QR Code"
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              <span className="hidden xs:inline sm:inline">Scan QR</span>
            </button>
          )}

          {/* Notification Bell Icon */}
          <button
            onClick={onOpenNotifications}
            className="w-9 h-9 rounded-full bg-[#fde7f3]/60 hover:bg-[#fde7f3] flex items-center justify-center text-[#26181c] relative transition-transform active:scale-95 cursor-pointer shrink-0"
            aria-label="Appointment Notifications"
          >
            <span className="material-symbols-outlined text-[19px] text-[#26181c]">
              notifications
            </span>
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-[#e6007e] text-white text-[9px] font-extrabold rounded-full flex items-center justify-center px-1 border-2 border-white animate-pulse">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Profile Avatar */}
          <button
            onClick={() => onNavigate('profile')}
            className="relative focus:outline-none ring-2 ring-transparent focus:ring-[#e6007e] rounded-full transition-transform active:scale-95 shrink-0"
            aria-label="Profile Settings"
          >
            <img
              src={userAvatar || AVATAR_URL}
              alt="User Profile Avatar"
              className="w-8 h-8 rounded-full object-cover border border-[#e0bec6]"
            />
          </button>
        </div>
      </div>
    </header>
  );
};

