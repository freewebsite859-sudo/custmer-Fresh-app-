import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface OfflineSyncStatusProps {
  isSyncing: boolean;
}

export const OfflineSyncStatus: React.FC<OfflineSyncStatusProps> = ({ isSyncing }) => {
  const [status, setStatus] = useState<'idle' | 'pending' | 'active' | 'complete' | 'error'>('idle');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isSyncing) {
      setStatus('active');
    } else if (isOffline) {
      setStatus('pending');
    } else if (status === 'active') {
      setStatus('complete');
      const timer = setTimeout(() => {
        setStatus('idle');
      }, 3000);
      return () => clearTimeout(timer);
    } else if (status !== 'complete' && status !== 'error') {
      setStatus('idle');
    }
  }, [isSyncing, isOffline, status]);

  if (status === 'idle') return null;

  const config = {
    pending: {
      icon: 'cloud_off',
      text: 'Offline',
      color: 'text-amber-500',
      animate: ''
    },
    active: {
      icon: 'sync',
      text: 'Syncing',
      color: 'text-[#e6007e]',
      animate: 'animate-spin'
    },
    complete: {
      icon: 'check_circle',
      text: 'Synced',
      color: 'text-green-500',
      animate: ''
    },
    error: {
      icon: 'error',
      text: 'Sync Error',
      color: 'text-red-500',
      animate: ''
    }
  };

  const current = config[status as keyof typeof config];
  if (!current) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -5 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-1 mt-0.5"
      >
        <span className={`material-symbols-outlined text-[12px] ${current.color} ${current.animate}`}>
          {current.icon}
        </span>
        <span className={`text-[9px] font-bold uppercase tracking-wider ${current.color} opacity-80 whitespace-nowrap`}>
          {current.text}
        </span>
      </motion.div>
    </AnimatePresence>
  );
};
