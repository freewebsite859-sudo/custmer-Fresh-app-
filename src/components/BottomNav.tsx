import React from 'react';
import { motion } from 'motion/react';
import { Screen } from '../types';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  unreadBookingsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentScreen,
  onNavigate,
  unreadBookingsCount = 0,
}) => {
  if (
    currentScreen === 'splash' ||
    currentScreen === 'welcome' ||
    currentScreen === 'checkout' ||
    currentScreen === 'salon-detail' ||
    currentScreen === 'location-modal' ||
    currentScreen === 'location-permission' ||
    currentScreen === 'support' ||
    currentScreen === 'settings' ||
    currentScreen === 'saved-addresses'
  ) {
    return null;
  }

  const items = [
    { id: 'home' as Screen, label: 'Home', icon: 'home', path: 'home' },
    { id: 'search' as Screen, label: 'Book', icon: 'calendar_month', path: 'book-now' },
    { id: 'favourites' as Screen, label: 'Saved', icon: 'favorite', path: 'favourites' },
    { id: 'bookings' as Screen, label: 'Bookings', icon: 'event_note', badge: unreadBookingsCount, path: 'my-bookings' },
    { id: 'rewards' as Screen, label: 'Rewards', icon: 'card_giftcard', path: 'rewards' },
    { id: 'profile' as Screen, label: 'Profile', icon: 'person', path: 'profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-3xl pb-safe shadow-[0_-8px_24px_rgba(0,0,0,0.06)] border-t border-[#e8e8e8]/60" data-active-classes="text-primary-pink">
      <div className="flex justify-around items-center pt-3 pb-4 px-1 max-w-md mx-auto min-h-[84px]">
        {items.map((item) => {
          const isActive = currentScreen === item.id;
          return (
            <motion.a
              key={item.id}
              href="#"
              data-path={item.path}
              whileTap={{ scale: 0.92 }}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(item.id);
              }}
              className={`flex flex-col items-center justify-center gap-1 min-w-[56px] py-1 transition-colors relative select-none ${
                isActive ? 'text-[#e6007e] font-semibold' : 'text-[#5a3f47] hover:text-[#e6007e]'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <motion.span
                  animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                  className="material-symbols-outlined text-[24px]"
                >
                  {item.icon}
                </motion.span>
                {item.badge && item.badge > 0 ? (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-2 bg-[#e6007e] text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full min-w-[16px] text-center shadow-sm"
                  >
                    {item.badge}
                  </motion.span>
                ) : null}
              </div>
              <span className="text-[11px] tracking-tight">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#e6007e] absolute -bottom-0.5 animate-pulse" />
              )}
            </motion.a>
          );
        })}
      </div>
    </nav>
  );
};
