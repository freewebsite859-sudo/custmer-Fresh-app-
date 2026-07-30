import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import { Screen, Salon, Service, Staff, Booking, UserLocation, AppNotification, ServiceReview, SavedProfessional, SavedService } from './types';
import {
  MOCK_SALONS,
  INITIAL_BOOKINGS,
  INITIAL_LOCATION,
} from './data/mockData';

import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { SalonDetailScreen } from './components/SalonDetailScreen';
import { CheckoutScreen } from './components/CheckoutScreen';
import { BookingsScreen } from './components/BookingsScreen';
import { SearchScreen } from './components/SearchScreen';
import { FavoritesScreen } from './components/FavoritesScreen';
import { LocationSelectionModal } from './components/LocationSelectionModal';
import { WelcomeScreen } from './components/WelcomeScreen';
import { RewardsScreen } from './components/RewardsScreen';
import { ProfileScreen } from './components/ProfileScreen';
import { SavedAddressesScreen } from './components/SavedAddressesScreen';
import { SupportScreen } from './components/SupportScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { BookingConfirmationModal } from './components/BookingConfirmationModal';
import { NotificationOverlay } from './components/NotificationOverlay';
import { NotificationDrawer } from './components/NotificationDrawer';
import { LoginScreen } from './components/auth/LoginScreen';
import { SignUpScreen } from './components/auth/SignUpScreen';
import { RoleAssignedConflict } from './components/auth/RoleAssignedConflict';
import { ScanUpiQrModal } from './components/ScanUpiQrModal';
import { AddUpiModal, SavedUpi } from './components/AddUpiModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { InstallApp } from './components/InstallApp';
import { Modal } from './components/Modal';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup' | 'role-conflict'>('login');
  const [conflictRole, setConflictRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Reads the real profile record and enforces the locked role contract:
    // access only when platform_role === 'customer' AND is_active === true.
    const verifyCustomerAccess = async (
      authUser: User
    ): Promise<{ allowed: boolean; role: string | null }> => {
      const readRole = async (): Promise<string | null> => {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('platform_role, is_active')
          .eq('id', authUser.id)
          .maybeSingle();
        if (error || !profile) return null;
        if (profile.platform_role === 'customer' && profile.is_active === true) {
          return 'customer';
        }
        return profile.platform_role ?? 'unsupported';
      };

      let role = await readRole();
      if (role === null) {
        // A brand-new signup can briefly precede its profile row; retry once
        // before treating the account as missing/unsupported.
        await new Promise((resolve) => setTimeout(resolve, 1200));
        role = await readRole();
      }
      return { allowed: role === 'customer', role };
    };

    const applySession = async (session: Session | null) => {
      if (!isMounted) return;
      const authUser = session?.user ?? null;
      if (!authUser) {
        // No session (or session expired/removed): always return to login.
        setUser(null);
        setAuthLoading(false);
        return;
      }

      const { allowed, role } = await verifyCustomerAccess(authUser);
      if (!isMounted) return;

      if (allowed) {
        setConflictRole(null);
        setUser(authUser);
      } else {
        // Block non-customer, inactive or role-less accounts and end the
        // session so a refresh always returns to a safe auth screen.
        setUser(null);
        setConflictRole(role);
        setAuthScreen('role-conflict');
        await supabase.auth.signOut();
      }
      setAuthLoading(false);
    };

    try {
      supabase.auth.getSession()
        .then(({ data }) => applySession(data.session))
        .catch((err) => {
          console.warn('Supabase auth notice:', err?.message || err);
          if (isMounted) {
            setUser(null);
            setAuthLoading(false);
          }
        });

      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          void applySession(session);
        }
      });

      return () => {
        isMounted = false;
        data?.subscription?.unsubscribe();
      };
    } catch (e) {
      console.warn('Supabase init notice:', e);
      if (isMounted) {
        setUser(null);
        setAuthLoading(false);
      }
    }
  }, []);

  const [screenStack, setScreenStack] = useState<Screen[]>(['home']);
  const currentScreen = screenStack[screenStack.length - 1];

  const setCurrentScreen = (screen: Screen) => {
    const mainTabs: Screen[] = ['home', 'search', 'favourites', 'bookings', 'rewards', 'profile'];
    setScreenStack(prev => {
      if (mainTabs.includes(screen)) {
        return [screen];
      }
      if (prev[prev.length - 1] === screen) return prev;
      return [...prev, screen];
    });
  };

  const handleBack = () => {
    setScreenStack(prev => (prev.length > 1 ? prev.slice(0, -1) : ['home']));
  };

  const [isAppointmentDismissed, setIsAppointmentDismissed] = useState(false);
  const [salons] = useState<Salon[]>(MOCK_SALONS);
  const [selectedSalon, setSelectedSalon] = useState<Salon>(MOCK_SALONS[0]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([
    MOCK_SALONS[0].services[0],
  ]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(
    MOCK_SALONS[0].staff[0] || null
  );

  const [userLocation, setUserLocation] = useState<UserLocation>(() => {
    const saved = localStorage.getItem('nexora_user_location');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved location:', e);
      }
    }
    return INITIAL_LOCATION;
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_favorites');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse favorites:', e);
      }
    }
    return ['aura-premium', 'glam-room'];
  });

  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_recently_viewed');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse recently viewed:', e);
      }
    }
    return ['aura-premium', 'glam-room'];
  });

  useEffect(() => {
    localStorage.setItem('nexora_recently_viewed', JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  const [favoriteProfessionals, setFavoriteProfessionals] = useState<SavedProfessional[]>(() => {
    const saved = localStorage.getItem('nexora_favorite_pros');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse favorite professionals:', e);
      }
    }
    return [
      {
        id: 'pro-1',
        salonId: 'aura-premium',
        name: 'Maya S.',
        role: 'Senior Hair Stylist',
        rating: 4.9,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        salonName: 'Aura Premium Salon',
        skills: ['Haircut', 'Balayage', 'Coloring']
      },
      {
        id: 'pro-2',
        salonId: 'glam-room',
        name: 'Arjun K.',
        role: 'Master Grooming Expert',
        rating: 4.8,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        salonName: 'The Glam Room',
        skills: ['Beard Styling', 'Fade Haircut']
      }
    ];
  });

  const [favoriteServices, setFavoriteServices] = useState<SavedService[]>(() => {
    const saved = localStorage.getItem('nexora_favorite_services');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse favorite services:', e);
      }
    }
    return [
      {
        id: 'srv-1',
        salonId: 'aura-premium',
        name: "Woman's Haircut & Blowdry",
        durationMinutes: 45,
        price: 899,
        salonName: 'Aura Premium Salon',
        category: 'Hair Styling'
      },
      {
        id: 'srv-2',
        salonId: 'luxe-spa',
        name: 'Deep Cleansing Facial Glow',
        durationMinutes: 60,
        price: 1499,
        salonName: 'Luxe Botanicals & Spa',
        category: 'Skincare'
      }
    ];
  });

  const [bookings, setBookings] = useState<Booking[]>(() => {
    const saved = localStorage.getItem('nexora_bookings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved bookings:', e);
      }
    }
    return INITIAL_BOOKINGS;
  });

  const [confirmedModalBooking, setConfirmedModalBooking] = useState<Booking | null>(null);
  const [initialBookingIdForBookings, setInitialBookingIdForBookings] = useState<string | undefined>(undefined);

  // Notification States
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('nexora_notifications');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse notifications:', e);
      }
    }
    return [
      {
        id: 'notif-init-1',
        bookingId: 'bk-101',
        salonName: 'Aura Premium Salon',
        timeSlot: '11:00 AM',
        dateStr: 'Sat, 28 Jul',
        servicesSummary: 'Balayage & Hair Styling',
        timestamp: Date.now() - 300000,
        read: false,
        type: 'reminder_1h',
        message: 'Your appointment at Aura Premium Salon starts in 1 hour at 11:00 AM!',
      },
    ];
  });

  const [activePushOverlay, setActivePushOverlay] = useState<AppNotification | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string>(() => {
    return localStorage.getItem('profile_avatar') || '';
  });

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // 1. Listen for BroadcastChannel messages from SW
    const syncChannel = new BroadcastChannel('app-sync');
    syncChannel.onmessage = (event) => {
      if (event.data.type === 'SYNC_COMPLETE') {
        console.log('Sync complete received from SW', event.data);
        setIsSyncing(false);
        
        // If data was passed from SW, use it to update state
        if (event.data.data && Array.isArray(event.data.data)) {
          setBookings(prev => {
            const newBookings = [...prev];
            event.data.data.forEach((newBk: Booking) => {
              const idx = newBookings.findIndex(b => b.id === newBk.id);
              if (idx > -1) {
                newBookings[idx] = newBk;
              } else {
                newBookings.push(newBk);
              }
            });
            return newBookings;
          });
        } else {
          // Fallback: Refresh bookings from localStorage 
          const saved = localStorage.getItem('nexora_bookings');
          if (saved) {
            setBookings(JSON.parse(saved));
          }
        }
        
        // Show a temporary sync notification
        const syncNotif: AppNotification = {
          id: `sync-${Date.now()}`,
          bookingId: '',
          salonName: 'System',
          timeSlot: '',
          dateStr: '',
          servicesSummary: 'Appointments synced',
          timestamp: Date.now(),
          read: false,
          type: 'reminder_1h',
          message: 'Your appointments have been successfully synced with the cloud.',
        };
        setNotifications(prev => [syncNotif, ...prev]);
        setActivePushOverlay(syncNotif);
      }
    };

    const triggerDirectSync = () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SYNC_NOW' });
        setIsSyncing(true);
      }
    };

    // 2. Register for Background Sync when regaining connectivity
    const handleOnline = async () => {
      console.log('App is online. Synchronizing data...');
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (registration && (registration as any).sync) {
            await (registration as any).sync.register('sync-appointments');
            setIsSyncing(true);
          } else {
            triggerDirectSync();
          }
        } catch (err) {
          console.warn('Background sync registration notice:', err);
          triggerDirectSync();
        }
      } else {
        triggerDirectSync();
      }
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      syncChannel.close();
      window.removeEventListener('online', handleOnline);
    };
  }, []); // Use empty dependency or handle refreshes carefully

  // Global UPI QR Scanner States
  const [isGlobalScanQrOpen, setIsGlobalScanQrOpen] = useState(false);
  const [isGlobalAddUpiOpen, setIsGlobalAddUpiOpen] = useState(false);
  const [globalPrefilledUpi, setGlobalPrefilledUpi] = useState('');
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(() => localStorage.getItem('nexora_app_installed') === 'true');
  const [hasDismissedInSession, setHasDismissedInSession] = useState(false);
  const [isPwaDismissedPermanently, setIsPwaDismissedPermanently] = useState(() => localStorage.getItem('nexora_pwa_dismissed') === 'true');

  // PWA Installation State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    if (isStandalone && !isAppInstalled) {
      setIsAppInstalled(true);
      localStorage.setItem('nexora_app_installed', 'true');
    }

    // Auto-show popup if:
    // 1. Not installed
    // 2. Not in standalone mode
    // 3. Not dismissed in current session
    // 4. Not dismissed permanently via "Don't show again" checkbox
    if (!isAppInstalled && !isStandalone && !hasDismissedInSession && !isPwaDismissedPermanently) {
      // Delay slightly for better UX (2 seconds)
      const timer = setTimeout(() => {
        setIsInstallModalOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAppInstalled, hasDismissedInSession, isPwaDismissedPermanently]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      console.log('beforeinstallprompt event was stashed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      // Clear the deferredPrompt so it can be garbage collected
      setDeferredPrompt(null);
      console.log('PWA was installed');
      
      // Mark as installed permanently
      setIsAppInstalled(true);
      localStorage.setItem('nexora_app_installed', 'true');
      
      // Show success notification
      const installNotif: AppNotification = {
        id: `install-${Date.now()}`,
        bookingId: '',
        salonName: 'Nexora',
        timeSlot: '',
        dateStr: '',
        servicesSummary: 'App Installed Successfully',
        timestamp: Date.now(),
        read: false,
        type: 'reminder_1h',
        message: 'Nexora has been added to your home screen. Enjoy a faster booking experience!',
      };
      setNotifications(prev => [installNotif, ...prev]);
      setActivePushOverlay(installNotif);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Sync state to localStorage
  useEffect(() => {
    localStorage.setItem('nexora_favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('nexora_favorite_pros', JSON.stringify(favoriteProfessionals));
  }, [favoriteProfessionals]);

  useEffect(() => {
    localStorage.setItem('nexora_favorite_services', JSON.stringify(favoriteServices));
  }, [favoriteServices]);

  useEffect(() => {
    localStorage.setItem('nexora_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('nexora_user_location', JSON.stringify(userLocation));
  }, [userLocation]);

  useEffect(() => {
    localStorage.setItem('nexora_notifications', JSON.stringify(notifications));
  }, [notifications]);

  // Trigger push notification helper
  const triggerPushNotificationForBooking = (targetBookingId?: string) => {
    const targetBooking =
      bookings.find((b) => b.id === targetBookingId) ||
      bookings.find((b) => b.status === 'CONFIRMED' || b.status === 'PENDING') ||
      bookings[0];

    if (!targetBooking) return;

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      bookingId: targetBooking.id,
      salonName: targetBooking.salonName,
      timeSlot: targetBooking.timeSlot,
      dateStr: targetBooking.dateStr,
      servicesSummary: targetBooking.services.map((s) => s.name).join(', '),
      timestamp: Date.now(),
      read: false,
      type: 'reminder_1h',
      message: `Your appointment at ${targetBooking.salonName} starts in 1 hour (${targetBooking.timeSlot})!`,
    };

    setNotifications((prev) => [newNotif, ...prev]);
    setActivePushOverlay(newNotif);

    // Trigger Browser Push Notification if browser supports and permitted
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(`⏰ 1-Hour Reminder: ${targetBooking.salonName}`, {
          body: `Your appointment for ${newNotif.servicesSummary} starts in 1 hour at ${targetBooking.timeSlot}.`,
          icon: '/icon.png',
        });
      } catch (e) {
        console.warn('Native push notification error', e);
      }
    }
  };

  const handleToggleFavorite = (salonId: string) => {
    setFavorites((prev) =>
      prev.includes(salonId) ? prev.filter((id) => id !== salonId) : [...prev, salonId]
    );
  };

  const handleSelectSalon = (salon: Salon) => {
    setSelectedSalon(salon);
    setSelectedServices(salon.services.length > 0 ? [salon.services[0]] : []);
    setSelectedStaff(salon.staff.length > 0 ? salon.staff[0] : null);
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((id) => id !== salon.id);
      return [salon.id, ...filtered].slice(0, 10);
    });
    setCurrentScreen('salon-detail');
  };

  const handleToggleService = (service: Service) => {
    setSelectedServices((prev) => {
      const exists = prev.some((s) => s.id === service.id);
      if (exists) {
        return prev.filter((s) => s.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const handleConfirmBooking = (bookingData: {
    salon: Salon;
    services: Service[];
    totalAmount: number;
    dateStr: string;
    timeSlot: string;
    staffName?: string;
    status?: 'CONFIRMED' | 'payment_pending';
    bookingId?: string;
  }, onSuccess?: () => void) => {
    const status = bookingData.status || 'CONFIRMED';
    
    if (bookingData.bookingId) {
       // Update existing
       const existingBooking = bookings.find(b => b.id === bookingData.bookingId);
       if (!existingBooking) return;
       
       const updatedBooking = { ...existingBooking, status: status };
       setBookings((prev) => prev.map(b => b.id === bookingData.bookingId ? updatedBooking : b));
       
       if (status === 'CONFIRMED') {
          setConfirmedModalBooking(updatedBooking);
          setTimeout(() => {
            if (updatedBooking) triggerPushNotificationForBooking(updatedBooking.id);
          }, 1500);
          if (onSuccess) onSuccess();
       }
       return updatedBooking;
    }

    const newBooking: Booking = {
      id: `NX-${Math.floor(1000 + Math.random() * 9000)}`,
      salonId: bookingData.salon.id,
      salonName: bookingData.salon.name,
      services: bookingData.services,
      totalAmount: bookingData.totalAmount,
      dateStr: bookingData.dateStr,
      timeSlot: bookingData.timeSlot,
      status: status,
      staffName: bookingData.staffName,
      locationArea: bookingData.salon.area,
      createdTime: Date.now(),
    };

    setBookings((prev) => [newBooking, ...prev]);

    if (status === 'CONFIRMED') {
      setConfirmedModalBooking(newBooking);

      // Auto-schedule preview push notification for new booking after 1.5 seconds
      setTimeout(() => {
        triggerPushNotificationForBooking(newBooking.id);
      }, 1500);
      if (onSuccess) onSuccess();
      setCurrentScreen('home');
    }
    
    return newBooking;
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'CANCELLED' } : b))
    );
  };

  const handleMarkBookingReviewed = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, isReviewed: true } : b))
    );
  };

  const handleAddReviewFromBooking = (salonId: string, newRev: Omit<ServiceReview, 'id' | 'date'>) => {
    const storageKey = `nexora_service_reviews_${salonId}`;
    const saved = localStorage.getItem(storageKey);
    let currentReviews: ServiceReview[] = [];
    if (saved) {
      try {
        currentReviews = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    const created: ServiceReview = {
      ...newRev,
      id: `sr-${Date.now()}`,
      date: 'Just now',
    };
    const updatedReviews = [created, ...currentReviews];
    localStorage.setItem(storageKey, JSON.stringify(updatedReviews));
  };

  const handleSnoozeNotification = (id: string) => {
    setActivePushOverlay(null);
    // Re-trigger overlay after 10 seconds for testing/preview
    setTimeout(() => {
      const snoozedNotif = notifications.find((n) => n.id === id);
      if (snoozedNotif) {
        setActivePushOverlay({
          ...snoozedNotif,
          message: `[Snoozed Alert] ${snoozedNotif.salonName} appointment starts soon at ${snoozedNotif.timeSlot}!`,
        });
      }
    }, 10000);
  };

  // Screen Title helper
  const getHeaderTitle = (): string => {
    switch (currentScreen) {
      case 'home':
        return '';
      case 'search':
        return 'Find Salons';
      case 'salon-detail':
        return 'Booking Detail';
      case 'checkout':
        return 'Checkout';
      case 'bookings':
        return 'My Bookings';
      case 'favourites':
        return 'Favourites';
      case 'rewards':
        return 'Rewards & Loyalty';
      case 'profile':
        return 'My Profile';
      case 'saved-addresses':
        return 'Saved Addresses';
      case 'support':
        return 'Help Home';
      case 'settings':
        return 'App Settings';
      default:
        return 'Nexora';
    }
  };

  const showHeaderBack =
    currentScreen === 'search' ||
    currentScreen === 'salon-detail' ||
    currentScreen === 'checkout' ||
    currentScreen === 'favourites' ||
    currentScreen === 'saved-addresses' ||
    currentScreen === 'support' ||
    currentScreen === 'settings';
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#fff8f8] text-[#26181c] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#e6007e]/20 border-t-[#e6007e] rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-[#8e004b]">Loading Nexora Salon...</p>
      </div>
    );
  }

  if (!user) {
    if (authScreen === 'role-conflict') {
      return (
        <RoleAssignedConflict
          existingRole={conflictRole ?? undefined}
          onLogin={() => setAuthScreen('login')}
          onUseAnotherEmail={() => setAuthScreen('signup')}
          onContactSupport={() => setCurrentScreen('support')}
        />
      );
    }
    if (authScreen === 'signup') {
      return <SignUpScreen onToggleAuth={() => setAuthScreen('login')} />;
    }
    return (
      <LoginScreen
        onToggleAuth={() => setAuthScreen('signup')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8f8] text-[#26181c] font-['Inter',sans-serif] relative flex flex-col justify-between">
      {/* Floating Interactive Push Notification Overlay */}
      <NotificationOverlay
        notification={activePushOverlay}
        onDismiss={() => setActivePushOverlay(null)}
        onSnooze={handleSnoozeNotification}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />

      {/* Drawer for Notification History and Push Settings */}
      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        notifications={notifications}
        bookings={bookings}
        onMarkAllAsRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onClearAll={() => setNotifications([])}
        onTriggerTestNotification={triggerPushNotificationForBooking}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />

      {/* Booking Confirmation Modal overlay when booking succeeds */}
      {confirmedModalBooking && (
        <BookingConfirmationModal
          booking={confirmedModalBooking}
          onViewBookings={(bookingId) => {
            setInitialBookingIdForBookings(bookingId || confirmedModalBooking.id);
            setConfirmedModalBooking(null);
            setCurrentScreen('bookings');
          }}
          onClose={() => {
            setConfirmedModalBooking(null);
            setCurrentScreen('home');
          }}
        />
      )}

      {/* Render Header for main views (outside max-w-md container for full viewport width) */}
      {currentScreen !== 'welcome' &&
        currentScreen !== 'splash' &&
        currentScreen !== 'location-modal' && currentScreen !== 'salon-detail' && currentScreen !== 'checkout' && (
          <Header
            currentScreen={currentScreen}
            title={getHeaderTitle()}
            onNavigate={(screen) => setCurrentScreen(screen)}
            showBack={showHeaderBack}
            onBack={() => {
              const cur = currentScreen as string;
              if (cur === 'checkout') setCurrentScreen('salon-detail');
              else if (cur === 'salon-detail') setCurrentScreen('home');
              else if (cur === 'search') setCurrentScreen('home');
              else if (cur === 'saved-addresses') setCurrentScreen('profile');
              else if (cur === 'support') setCurrentScreen('profile');
              else if (cur === 'settings') setCurrentScreen('profile');
              else setCurrentScreen('home');
            }}
            unreadNotificationCount={unreadCount}
            onOpenNotifications={() => setIsNotificationDrawerOpen(true)}
            onOpenQrScanner={() => setIsGlobalScanQrOpen(true)}
            userAvatar={profileAvatar}
            isSyncing={isSyncing}
          />
        )}

      <div className="w-full flex-1 flex flex-col relative">
        {/* Content Body Container */}
        <main
          className={`flex-1 w-full max-w-md mx-auto ${
            currentScreen !== 'welcome' &&
            currentScreen !== 'splash' &&
            currentScreen !== 'location-modal' && currentScreen !== 'salon-detail' && currentScreen !== 'checkout'
              ? 'px-5 pt-20'
              : ''
          }`}
        >
          <div key={currentScreen} className="w-full h-full flex flex-col animate-fadeIn">
            {currentScreen === 'welcome' && (
              <WelcomeScreen onContinue={() => setCurrentScreen('home')} />
            )}

          {currentScreen === 'home' && (
            <HomeScreen
              location={userLocation}
              salons={salons}
              favorites={favorites}
              recentlyViewed={recentlyViewed}
              bookings={bookings}
              onToggleFavorite={handleToggleFavorite}
              onSelectSalon={handleSelectSalon}
              onNavigate={(s) => setCurrentScreen(s)}
              onOpenLocationSelector={() => setCurrentScreen('location-modal')}
              isAppointmentDismissed={isAppointmentDismissed}
              onDismissAppointment={() => setIsAppointmentDismissed(true)}
            />
          )}

          {currentScreen === 'search' && (
            <SearchScreen
              salons={salons}
              favorites={favorites}
              userCity={userLocation.city}
              onToggleFavorite={handleToggleFavorite}
              onSelectSalon={handleSelectSalon}
              onBack={() => setCurrentScreen('home')}
            />
          )}

          {currentScreen === 'salon-detail' && (
            <SalonDetailScreen
              salon={selectedSalon}
              selectedServices={selectedServices}
              selectedStaff={selectedStaff}
              onToggleService={handleToggleService}
              onSelectStaff={(staff) => setSelectedStaff(staff)}
              onProceedToCheckout={() => setCurrentScreen('checkout')}
              onBack={() => setCurrentScreen('home')}
              isFavorite={favorites.includes(selectedSalon.id)}
              onToggleFavorite={() => handleToggleFavorite(selectedSalon.id)}
              bookings={bookings}
            />
          )}

          {currentScreen === 'checkout' && (
            <CheckoutScreen
              salon={selectedSalon}
              selectedServices={selectedServices}
              selectedStaff={selectedStaff}
              onConfirmBooking={handleConfirmBooking}
              onBack={() => setCurrentScreen('salon-detail')}
            />
          )}

          {currentScreen === 'bookings' && (
            <BookingsScreen
              bookings={bookings}
              salons={salons}
              onNavigate={(s) => setCurrentScreen(s)}
              onCancelBooking={handleCancelBooking}
              onTriggerTestNotification={triggerPushNotificationForBooking}
              onAddReview={handleAddReviewFromBooking}
              onMarkBookingReviewed={handleMarkBookingReviewed}
              initialSelectedBookingId={initialBookingIdForBookings}
            />
          )}

          {currentScreen === 'favourites' && (
            <FavoritesScreen
              salons={salons}
              favorites={favorites}
              favoriteProfessionals={favoriteProfessionals}
              favoriteServices={favoriteServices}
              onToggleFavoriteSalon={handleToggleFavorite}
              onToggleFavoriteProfessional={(proId) => {
                setFavoriteProfessionals((prev) => prev.filter((p) => p.id !== proId));
              }}
              onToggleFavoriteService={(servId) => {
                setFavoriteServices((prev) => prev.filter((s) => s.id !== servId));
              }}
              onSelectSalon={handleSelectSalon}
              onNavigate={(s) => setCurrentScreen(s)}
            />
          )}

          {currentScreen === 'rewards' && <RewardsScreen bookings={bookings} />}

          {currentScreen === 'profile' && (
            <ProfileScreen
              location={userLocation}
              favoritesCount={favorites.length}
              bookings={bookings}
              onNavigate={(s) => setCurrentScreen(s)}
              onBack={handleBack}
              onOpenLocation={() => setCurrentScreen('location-modal')}
              onAvatarUpdate={(newAvatar) => setProfileAvatar(newAvatar)}
            />
          )}

          {currentScreen === 'saved-addresses' && (
            <SavedAddressesScreen
              onBack={handleBack}
              onNavigate={(s) => setCurrentScreen(s)}
            />
          )}

          {currentScreen === 'support' && (
            <SupportScreen
              onBack={handleBack}
              onNavigate={(s) => setCurrentScreen(s)}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsScreen
              onBack={handleBack}
              onNavigate={(s) => setCurrentScreen(s)}
              onLogout={() => {
                supabase.auth.signOut();
                setCurrentScreen('welcome');
              }}
            />
          )}

          {currentScreen === 'location-modal' && (
            <LocationSelectionModal
              currentLocation={userLocation}
              onSelectLocation={(loc) => {
                setUserLocation(loc);
                setCurrentScreen('home');
              }}
              onClose={() => setCurrentScreen('home')}
            />
          )}

          {/* Safe Fallback for any unhandled screen state to prevent white screen */}
              {!['welcome', 'home', 'search', 'salon-detail', 'checkout', 'bookings', 'favourites', 'rewards', 'profile', 'saved-addresses', 'support', 'settings', 'location-modal'].includes(currentScreen) && (
                <HomeScreen
                  location={userLocation}
                  salons={salons}
                  favorites={favorites}
                  recentlyViewed={recentlyViewed}
                  bookings={bookings}
                  onToggleFavorite={handleToggleFavorite}
                  onSelectSalon={handleSelectSalon}
                  onNavigate={(s) => setCurrentScreen(s)}
                  onOpenLocationSelector={() => setCurrentScreen('location-modal')}
                  isAppointmentDismissed={isAppointmentDismissed}
                  onDismissAppointment={() => setIsAppointmentDismissed(true)}
                />
              )}
          </div>
        </main>

        {/* Floating Bottom Navigation */}
        <BottomNav
          currentScreen={currentScreen}
          onNavigate={(s) => setCurrentScreen(s)}
          unreadBookingsCount={
            bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING').length
          }
        />
      </div>

      {/* Global Scan UPI QR Code Modal */}
      <ScanUpiQrModal
        isOpen={isGlobalScanQrOpen}
        onClose={() => setIsGlobalScanQrOpen(false)}
        onUpiScanned={(scannedUpi) => {
          const saved = localStorage.getItem('nexora_saved_upis');
          const list: SavedUpi[] = saved ? JSON.parse(saved) : [];
          localStorage.setItem('nexora_saved_upis', JSON.stringify([scannedUpi, ...list]));
          setIsGlobalScanQrOpen(false);
          setCurrentScreen('profile');
        }}
        onUpiParsed={(parsedUpiId) => {
          setGlobalPrefilledUpi(parsedUpiId);
          setIsGlobalScanQrOpen(false);
          setIsGlobalAddUpiOpen(true);
        }}
      />

      {/* Global Add UPI Modal for QR prefill */}
      <AddUpiModal
        isOpen={isGlobalAddUpiOpen}
        onClose={() => {
          setIsGlobalAddUpiOpen(false);
          setGlobalPrefilledUpi('');
        }}
        initialUpiInput={globalPrefilledUpi}
        onOpenScanner={() => {
          setIsGlobalAddUpiOpen(false);
          setIsGlobalScanQrOpen(true);
        }}
        onUpiAdded={(newUpi) => {
          const saved = localStorage.getItem('nexora_saved_upis');
          const list: SavedUpi[] = saved ? JSON.parse(saved) : [];
          localStorage.setItem('nexora_saved_upis', JSON.stringify([newUpi, ...list]));
          setIsGlobalAddUpiOpen(false);
          setGlobalPrefilledUpi('');
          setCurrentScreen('profile');
        }}
      />

      <PWAInstallPrompt 
        deferredPrompt={deferredPrompt} 
        onInstall={() => setDeferredPrompt(null)} 
      />

      <Modal isOpen={isInstallModalOpen} onClose={() => {
        setIsInstallModalOpen(false);
        setHasDismissedInSession(true);
        setIsPwaDismissedPermanently(localStorage.getItem('nexora_pwa_dismissed') === 'true');
      }} title="Install Application">
        <InstallApp 
          onClose={() => {
            setIsInstallModalOpen(false);
            setHasDismissedInSession(true);
            setIsPwaDismissedPermanently(localStorage.getItem('nexora_pwa_dismissed') === 'true');
          }} 
          onInstall={() => {
            if (deferredPrompt) {
              deferredPrompt.prompt();
              deferredPrompt.userChoice.then((choiceResult: any) => {
                if (choiceResult.outcome === 'accepted') {
                  setDeferredPrompt(null);
                  setIsAppInstalled(true);
                  localStorage.setItem('nexora_app_installed', 'true');
                }
              });
            } else {
              // Mock success if no prompt is available (for preview)
              setIsAppInstalled(true);
              localStorage.setItem('nexora_app_installed', 'true');
            }
            setIsPwaDismissedPermanently(localStorage.getItem('nexora_pwa_dismissed') === 'true');
            setIsInstallModalOpen(false);
          }} 
        />
      </Modal>
    </div>
  );
}

