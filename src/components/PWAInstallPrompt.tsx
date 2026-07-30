import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface PWAInstallPromptProps {
  deferredPrompt: any;
  onInstall: () => void;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ deferredPrompt, onInstall }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (deferredPrompt) {
      // Check if user has already dismissed or installed
      const isDismissedForever = localStorage.getItem('nexora_pwa_dismissed') === 'true';
      const dismissedAt = localStorage.getItem('nexora_pwa_dismissed_at');
      const now = Date.now();
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

      if (!isDismissedForever && (!dismissedAt || (now - parseInt(dismissedAt)) > SEVEN_DAYS)) {
        // Only show after a short delay to not overwhelm the user immediately
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    try {
      const result = await deferredPrompt.prompt();
      console.log('Install prompt result:', result);
      
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to the install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        setIsVisible(false);
      }
      
      // Notify parent to clear the prompt
      onInstall();
    } catch (err) {
      console.error('Installation failed:', err);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Remember dismissal with timestamp
    localStorage.setItem('nexora_pwa_dismissed_at', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-28 mb-safe left-4 right-4 z-[100] max-w-sm mx-auto"
      >
        <div className="bg-[#26181c] text-white p-5 rounded-3xl shadow-2xl border border-white/10 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 bg-white">
              <img 
                src="/icon.jpg" 
                alt="Nexora Icon" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-white">Add Nexora to Home Screen</h3>
              <p className="text-[12px] text-white/70 mt-1 leading-relaxed">
                Install our app for a faster, premium booking experience and easy access.
              </p>
            </div>
            <button 
              onClick={handleDismiss}
              className="text-white/40 hover:text-white"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
          <div className="flex gap-3 mt-1">
            <button
              onClick={handleDismiss}
              className="flex-1 h-11 rounded-xl border border-white/20 text-[13px] font-semibold hover:bg-white/5 transition-colors"
            >
              Later
            </button>
            <button
              onClick={handleInstall}
              className="flex-[2] h-11 rounded-xl bg-[#e6007e] text-white text-[13px] font-bold shadow-lg shadow-[#e6007e]/20 active:scale-95 transition-all"
            >
              Install Now
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
