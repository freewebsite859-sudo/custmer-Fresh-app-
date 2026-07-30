import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { detectBrowserAndOS, HelpTabType, EnvironmentInfo } from '../utils/browserDetect';

const screenshots = [
  { url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=400', label: 'Explore Premium Salons' },
  { url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&q=80&w=400', label: 'Choose Your Services' },
  { url: 'https://images.unsplash.com/photo-1595475243692-3929201f9720?auto=format&fit=crop&q=80&w=400', label: 'Select Preferred Time' },
  { url: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&q=80&w=400', label: 'Fast & Secure Checkout' },
];

interface InstallAppProps {
  onClose?: () => void;
  onInstall?: () => void;
  initialHelpTab?: HelpTabType;
}

export const InstallApp: React.FC<InstallAppProps> = ({ onClose, onInstall, initialHelpTab }) => {
  const [detectedEnv] = useState<EnvironmentInfo>(() => detectBrowserAndOS());
  const [helpTab, setHelpTab] = useState<HelpTabType>(() => initialHelpTab || detectedEnv.recommendedTab);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [dontShowAgain, setDontShowAgain] = useState(() => {
    return localStorage.getItem('nexora_pwa_dismissed') === 'true';
  });

  const handleToggleDontShow = () => {
    const newValue = !dontShowAgain;
    setDontShowAgain(newValue);
    if (newValue) {
      localStorage.setItem('nexora_pwa_dismissed', 'true');
    } else {
      localStorage.removeItem('nexora_pwa_dismissed');
    }
  };

  const prevScreenshot = (e?: React.MouseEvent | React.SyntheticEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    setIsAutoPlaying(false);
    setActiveScreenshot(prev => (prev - 1 + screenshots.length) % screenshots.length);
  };

  const nextScreenshot = (e?: React.MouseEvent | React.SyntheticEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    setIsAutoPlaying(false);
    setActiveScreenshot(prev => (prev + 1) % screenshots.length);
  };

  useEffect(() => {
    if (!isSuccess || !onClose) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSuccess, onClose]);

  useEffect(() => {
    if (isInstalling || isSuccess || !isAutoPlaying) return;
    const timer = setInterval(() => {
      setActiveScreenshot(prev => (prev + 1) % screenshots.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isInstalling, isSuccess, isAutoPlaying]);

  const handleInstallClick = async () => {
    setIsInstalling(true);
    setInstallProgress(10);
    
    // Tracking event for conversion funnel analysis
    try {
      const trackingData = JSON.parse(localStorage.getItem('nexora_install_attempts') || '[]');
      trackingData.push({
        timestamp: new Date().toISOString(),
        method: 'direct_pwa_link',
        status: 'initiated',
        isOnline: navigator.onLine
      });
      // Limit to last 20 events to save space
      localStorage.setItem('nexora_install_attempts', JSON.stringify(trackingData.slice(-20)));
    } catch (e) {
      console.warn('Failed to log install tracking', e);
    }

    // Progress simulation
    const interval = setInterval(() => {
      setInstallProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 150);
    
    if (onInstall) {
      await onInstall();
    }
    
    setTimeout(() => {
      clearInterval(interval);
      setInstallProgress(100);
      setTimeout(() => {
        setIsInstalling(false);
        setIsSuccess(true);
      }, 500);
    }, 2000);
  };

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
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ 
        type: "spring",
        damping: 15,
        stiffness: 200,
        duration: 0.5
      }}
      className="bg-[var(--color-surface-container-lowest)] rounded-[28px] overflow-hidden border border-[var(--color-outline-subtle)] shadow-2xl flex flex-col max-w-sm w-[calc(100vw-32px)] relative"
    >
      {/* Top Indicators Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none flex items-center justify-between px-4">
        {/* Persistent Offline Mode Indicator */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-[var(--color-on-surface)] text-white py-2 px-4 flex items-center justify-center gap-2 overflow-hidden rounded-b-xl pointer-events-auto shadow-md"
            >
              <span className="material-symbols-outlined text-[16px] text-[var(--color-primary-pink)]">wifi_off</span>
              <span className="text-[10px] font-bold tracking-tight uppercase">Offline Active</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* App Installed Status Indicator */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-green-50 text-green-600 py-1.5 px-3 flex items-center gap-1.5 rounded-full border border-green-200 mt-2 pointer-events-auto shadow-sm"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[10px] font-bold">check</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider">Installed</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 flex flex-col items-center text-center">
        <AnimatePresence mode="wait">
          {isSuccess ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center w-full"
            >
              <motion.div 
                animate={{ 
                  scale: [1, 1.05, 1],
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg mb-6 text-white relative"
              >
                {/* Pulse ripple effect */}
                <motion.div
                  animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  className="absolute inset-0 bg-green-500 rounded-full"
                />
                <motion.span 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="material-symbols-outlined text-[44px] z-10"
                >
                  check
                </motion.span>
              </motion.div>
              
              <h3 className="text-[20px] font-extrabold text-[var(--color-on-surface)] mb-2 font-headline">Ready to Go!</h3>
              <p className="text-[13px] text-[var(--color-on-surface-variant)] leading-relaxed mb-8 px-2">
                Nexora Beauty has been added. You can now access it directly from your home screen.
              </p>

              <button
                onClick={onClose}
                className="w-full h-12 rounded-xl bg-[var(--color-primary-pink)] text-white font-bold text-xs shadow-md hover:bg-[var(--color-primary)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                Done
                <span className="opacity-60 text-[10px] font-normal bg-white/20 px-1.5 py-0.5 rounded-md">
                  {countdown}s
                </span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center w-full"
            >
              {/* App Icon Visual */}
              <div className="w-20 h-20 bg-gradient-to-br from-[var(--color-primary-pink)] to-[var(--color-primary)] rounded-[22px] flex items-center justify-center shadow-lg mb-6 relative group overflow-hidden">
                <span className="material-symbols-outlined text-white text-[44px]">content_cut</span>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <h3 className="text-[20px] font-extrabold text-[var(--color-on-surface)] mb-2 font-headline">Install Nexora Beauty</h3>
              <p className="text-[13px] text-[var(--color-on-surface-variant)] leading-relaxed mb-6 px-2">
                Add Nexora to your home screen for a faster, seamless booking experience.
              </p>

              {/* Screenshot Carousel */}
              <div className="w-full mb-6 flex flex-col gap-2.5">
                <div 
                  className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-[var(--color-surface-container-low)] border border-[var(--color-outline-variant)] shadow-inner group select-none touch-pan-y"
                  title="Swipe left or right, or click to view full screen"
                >
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeScreenshot}
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(_e, { offset, velocity }) => {
                        const swipeThreshold = 30;
                        const velocityThreshold = 150;
                        if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
                          nextScreenshot();
                        } else if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
                          prevScreenshot();
                        }
                      }}
                      onTap={() => setIsZoomed(true)}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                      className="absolute inset-0 overflow-hidden cursor-grab active:cursor-grabbing"
                    >
                      {/* Ken Burns subtle pan & slow-zoom image effect */}
                      <motion.img 
                        key={`img-${activeScreenshot}`}
                        src={screenshots[activeScreenshot].url} 
                        alt={screenshots[activeScreenshot].label}
                        initial={{ scale: 1, x: 0, y: 0 }}
                        animate={{ 
                          scale: [1, 1.08],
                          x: [0, activeScreenshot % 2 === 0 ? -6 : 6],
                          y: [0, activeScreenshot % 3 === 0 ? -4 : 4]
                        }}
                        transition={{
                          duration: 5.5,
                          ease: "easeOut"
                        }}
                        className="w-full h-full object-cover pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 pointer-events-none">
                        <span className="text-white text-[12px] font-bold text-left drop-shadow-md">
                          {screenshots[activeScreenshot].label}
                        </span>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Zoom Indicator Badge */}
                  <div className="absolute top-2.5 right-2.5 bg-black/40 backdrop-blur-md text-white rounded-full p-1.5 opacity-80 group-hover:opacity-100 transition-opacity z-10 pointer-events-none flex items-center justify-center border border-white/20">
                    <span className="material-symbols-outlined text-[15px]">zoom_in</span>
                  </div>

                  {/* Manual Navigation Arrows */}
                  <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                    <button 
                      onClick={prevScreenshot}
                      className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/50 transition-colors pointer-events-auto active:scale-90"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                    </button>
                    <button 
                      onClick={nextScreenshot}
                      className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/50 transition-colors pointer-events-auto active:scale-90"
                    >
                      <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                    </button>
                  </div>
                </div>
                {/* Carousel Indicators */}
                <div className="flex justify-center gap-1.5">
                  {screenshots.map((_, idx) => (
                    <div 
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeScreenshot ? 'w-5 bg-[var(--color-primary-pink)]' : 'w-1.5 bg-[var(--color-outline-variant)]'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Fullscreen Zoom Modal Overlay */}
              <AnimatePresence>
                {isZoomed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsZoomed(false)}
                    className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 cursor-zoom-out"
                  >
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsZoomed(false);
                        }}
                        className="w-10 h-10 rounded-full bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[24px]">close</span>
                      </button>
                    </div>

                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      onClick={(e) => e.stopPropagation()}
                      className="relative max-w-2xl w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl flex flex-col cursor-default"
                    >
                      <div className="relative aspect-[16/10] w-full bg-black flex items-center justify-center overflow-hidden touch-pan-y select-none">
                        <motion.img
                          key={`zoom-${activeScreenshot}`}
                          drag="x"
                          dragConstraints={{ left: 0, right: 0 }}
                          dragElastic={0.2}
                          onDragEnd={(_e, { offset, velocity }) => {
                            const swipeThreshold = 30;
                            const velocityThreshold = 150;
                            if (offset.x < -swipeThreshold || velocity.x < -velocityThreshold) {
                              nextScreenshot();
                            } else if (offset.x > swipeThreshold || velocity.x > velocityThreshold) {
                              prevScreenshot();
                            }
                          }}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25 }}
                          src={screenshots[activeScreenshot].url}
                          alt={screenshots[activeScreenshot].label}
                          className="w-full h-full object-contain cursor-grab active:cursor-grabbing pointer-events-auto"
                          referrerPolicy="no-referrer"
                        />

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            prevScreenshot(e);
                          }}
                          className="absolute left-3 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[24px]">chevron_left</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            nextScreenshot(e);
                          }}
                          className="absolute right-3 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[24px]">chevron_right</span>
                        </button>
                      </div>

                      <div className="p-4 bg-[#180f12] text-white flex items-center justify-between border-t border-white/10">
                        <span className="text-sm font-extrabold">{screenshots[activeScreenshot].label}</span>
                        <span className="text-xs text-white/60 font-semibold">{activeScreenshot + 1} / {screenshots.length}</span>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Offline Value Proposition Card */}
              <div className="w-full bg-[var(--color-surface-container-low)] rounded-2xl p-3.5 border border-[var(--color-outline-variant)] mb-3 flex items-start gap-3 text-left">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[var(--color-primary-pink)] flex-shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">cloud_off</span>
                </div>
                <div>
                  <h4 className="text-[12px] font-extrabold text-[var(--color-on-surface)] uppercase tracking-wider mb-0.5">Stay Prepared</h4>
                  <p className="text-[11px] text-[var(--color-on-surface-variant)] leading-tight">
                    You can still view your <strong>existing salon schedule</strong> and appointment details even without an active internet connection.
                  </p>
                </div>
              </div>

              {/* Interactive Installation Help Guide with Auto-Detected helpTab */}
              <div className="w-full bg-[var(--color-surface-container-low)] rounded-2xl p-3.5 border border-[var(--color-outline-variant)] mb-6 text-left">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px] text-[#e6007e]">help_outline</span>
                    <h4 className="text-[12px] font-extrabold text-[var(--color-on-surface)] uppercase tracking-wider">
                      Installation Guide
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-[#e6007e] bg-[#fde7f3] border border-[#f3c2dc] px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e6007e] animate-pulse" />
                    <span>{detectedEnv.label}</span>
                  </span>
                </div>

                {/* Help Tabs Navigation */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none no-scrollbar">
                  {[
                    { id: 'ios-safari' as HelpTabType, label: 'iOS Safari', icon: 'smartphone' },
                    { id: 'android-chrome' as HelpTabType, label: 'Android', icon: 'android' },
                    { id: 'desktop-chrome' as HelpTabType, label: 'Chrome', icon: 'desktop_windows' },
                    { id: 'desktop-safari' as HelpTabType, label: 'Mac Safari', icon: 'laptop_mac' },
                  ].map(tab => {
                    const isSelected = helpTab === tab.id;
                    const isAutoDetected = detectedEnv.recommendedTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setHelpTab(tab.id)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 whitespace-nowrap transition-all cursor-pointer select-none shrink-0 border ${
                          isSelected
                            ? 'bg-[#26181c] text-white border-[#26181c] shadow-xs'
                            : 'bg-white text-[var(--color-on-surface-variant)] border-[var(--color-outline-subtle)] hover:bg-gray-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {tab.icon}
                        </span>
                        <span>{tab.label}</span>
                        {isAutoDetected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#e6007e]" title="Auto-detected for your browser" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active Tab Step-by-Step Instructions */}
                <div className="mt-2.5 pt-2 border-t border-[var(--color-outline-variant)] text-[11px] text-[var(--color-on-surface-variant)] leading-snug">
                  {helpTab === 'ios-safari' && (
                    <ol className="space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Tap the <strong>Share</strong> icon <span className="material-symbols-outlined text-[13px] inline text-[#e6007e] align-sub">ios_share</span> in Safari's toolbar.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Scroll down and tap <strong>Add to Home Screen</strong> <span className="material-symbols-outlined text-[13px] inline text-[#e6007e] align-sub">add_box</span>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Tap <strong>Add</strong> in top right to finish installing.</span>
                      </li>
                    </ol>
                  )}

                  {helpTab === 'android-chrome' && (
                    <ol className="space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Tap Chrome menu (⋮) or tap <strong>Install Now</strong> below.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Select <strong>Add to Home screen</strong> or <strong>Install app</strong> <span className="material-symbols-outlined text-[13px] inline text-[#e6007e] align-sub">download</span>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Confirm prompt to place Nexora icon on your home screen.</span>
                      </li>
                    </ol>
                  )}

                  {helpTab === 'desktop-chrome' && (
                    <ol className="space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Look for the <strong>Install</strong> icon <span className="material-symbols-outlined text-[13px] inline text-[#e6007e] align-sub">install_desktop</span> in address bar.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Or click menu (⋮) &gt; <strong>Save and Share</strong> &gt; <strong>Install Nexora</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Click <strong>Install</strong> in the browser prompt.</span>
                      </li>
                    </ol>
                  )}

                  {helpTab === 'desktop-safari' && (
                    <ol className="space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Click <strong>File</strong> in Mac Safari top menu bar.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Select <strong>Add to Dock...</strong> <span className="material-symbols-outlined text-[13px] inline text-[#e6007e] align-sub">dock</span>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">3</span>
                        <span>Click <strong>Add</strong> to pin Nexora to your Dock.</span>
                      </li>
                    </ol>
                  )}

                  {helpTab === 'other' && (
                    <ol className="space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">1</span>
                        <span>Open browser options or settings menu.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="w-4 h-4 rounded-full bg-[#26181c] text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">2</span>
                        <span>Select <strong>Add to Home screen</strong> or <strong>Install</strong>.</span>
                      </li>
                    </ol>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <button
                  onClick={onClose}
                  className="h-12 rounded-xl bg-[var(--color-surface)] border border-[var(--color-outline-subtle)] text-[var(--color-on-surface-variant)] font-bold text-xs hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer"
                >
                  Not Now
                </button>
                <button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  className="relative overflow-hidden h-12 rounded-xl bg-[var(--color-primary-pink)] text-white font-bold text-xs shadow-md hover:bg-[var(--color-primary)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                >
                  {!isInstalling && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{
                        repeat: Infinity,
                        repeatDelay: 2.2,
                        duration: 1.4,
                        ease: 'easeInOut',
                      }}
                    />
                  )}
                  {isInstalling ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin relative z-10" />
                  ) : (
                    <span className="material-symbols-outlined text-[18px] relative z-10">download</span>
                  )}
                  <span className="relative z-10">
                    {isInstalling ? 'Installing...' : 'Install Now'}
                  </span>
                </button>
              </div>

              {/* Don't show again toggle */}
              {!isInstalling && (
                <button 
                  onClick={handleToggleDontShow}
                  className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-[var(--color-surface-container)] transition-colors cursor-pointer group"
                >
                  <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${dontShowAgain ? 'bg-[var(--color-primary-pink)] border-[var(--color-primary-pink)]' : 'border-[var(--color-outline)] group-hover:border-[var(--color-primary-pink)]'}`}>
                    {dontShowAgain && <span className="material-symbols-outlined text-white text-[12px] font-bold">check</span>}
                  </div>
                  <span className="text-[11px] font-bold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Don't show again</span>
                </button>
              )}

              {/* Social Proof Footer */}
              <div className="mt-4 pt-3 border-t border-[var(--color-outline-variant)]/50 w-full flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-on-surface-variant)] font-medium">
                <span className="material-symbols-outlined text-[15px] text-[#e6007e]">groups</span>
                <span>Join <strong className="font-extrabold text-[var(--color-on-surface)]">10k+ users</strong> who installed Nexora</span>
              </div>

              {/* Progress Bar */}
              <AnimatePresence>
                {isInstalling && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="w-full mt-4 overflow-hidden"
                  >
                    <div className="w-full h-1.5 bg-[var(--color-surface-container-high)] rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-[var(--color-primary-pink)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${installProgress}%` }}
                        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                      />
                    </div>
                    <p className="text-[9px] text-[var(--color-on-surface-variant)] mt-1.5 font-bold uppercase tracking-widest">
                      Preparing Application... {installProgress}%
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Decorative background element */}
      <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-[var(--color-surface-container-high)]/20 rounded-full blur-3xl pointer-events-none" />
    </motion.div>
  );
};
