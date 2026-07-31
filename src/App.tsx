import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, supabaseConfigError } from './lib/supabaseClient';
import { Screen, Salon, Service, Staff, Booking, UserLocation, AppNotification, ServiceReview, SavedProfessional, SavedService, UserProfile } from './types';
import {
  INITIAL_LOCATION,
} from './data/mockData';
import { fetchPublicSalons } from './lib/salonRepository';
import { createCustomerBooking, createAdvanceOrder, loadRazorpayCheckout, openRazorpayAdvanceCheckout } from './lib/bookingRepository';
import { PaymentStatusTracker } from './components/PaymentStatusTracker';

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
import { OwnerDashboard } from './components/OwnerDashboard';
import { GrowthPartnerDashboard } from './components/GrowthPartnerDashboard';
import { LegalScreen } from './components/LegalScreen';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup' | 'role-conflict'>('login');
  const [conflictRole, setConflictRole] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      setAuthLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const client = supabase;

    const fetchProfile = async (userId: string) => {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as UserProfile;
    };

    const applySession = async (session: { user?: any } | null) => {
      if (!isMounted) return;
      const authUser = session?.user ?? null;
      if (!authUser) {
        setUser(null);
        setProfile(null);
        setAuthLoading(false);
        return;
      }

      let userProfile = await fetchProfile(authUser.id);
      
      // Retry logic for brand new signups
      if (!userProfile) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        userProfile = await fetchProfile(authUser.id);
      }

      if (!isMounted) return;

      if (userProfile && userProfile.is_active) {
        const allowedRoles = ['customer', 'business_user', 'growth_partner'];
        if (allowedRoles.includes(userProfile.platform_role)) {
          setConflictRole(null);
          setUser({ ...authUser, role: userProfile.platform_role });
          setProfile(userProfile);
          
          if (userProfile.platform_role === 'business_user') setCurrentScreen('owner-dashboard');
          else if (userProfile.platform_role === 'growth_partner') setCurrentScreen('gp-dashboard');
        } else {
          setUser(null);
          setProfile(null);
          setConflictRole(userProfile.platform_role);
          setAuthScreen('role-conflict');
          await client.auth.signOut();
        }
      } else if (userProfile && !userProfile.is_active) {
        setUser(null);
        setProfile(null);
        setConflictRole('inactive');
        setAuthScreen('role-conflict');
        await client.auth.signOut();
      } else {
        // No profile found even after retry
        setUser(null);
        setProfile(null);
        setAuthLoading(false);
        return;
      }
      setAuthLoading(false);
    };

    try {
      client.auth.getSession()
        .then(({ data, error }) => {
          if (isMounted) {
            if (error) {
              setUser(null);
              setAuthLoading(false);
              return;
            }
            void applySession(data?.session ?? null);
          }
        });

      const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
        if (isMounted) {
          void applySession(session);
        }
      });

      // Realtime subscription for profile changes
      const profileSubscription = client
        .channel('public:profiles')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles' },
          (payload) => {
            if (isMounted && user && payload.new.id === user.id) {
              setProfile(payload.new as UserProfile);
            }
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        authListener?.subscription?.unsubscribe();
        profileSubscription.unsubscribe();
      };
    } catch (e) {
      console.warn('Supabase init notice:', e);
      if (isMounted) {
        setAuthLoading(false);
      }
    }
  }, [user?.id]);

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
  // Live payment tracking watch (active Razorpay advance flow for a booking).
  const [paymentWatch, setPaymentWatch] = useState<{
    bookingId: string;
    salonName: string;
    paymentSubmitted: boolean;
  } | null>(null);
  const [salons, setSalons] = useState<Salon[]>([]);
  const [salonsLoading, setSalonsLoading] = useState(true);
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);

  // Live salon discovery: fetched from Supabase once per app load (no mock data).
  useEffect(() => {
    let isMounted = true;
    if (!supabase) {
      setSalonsLoading(false);
      return () => {
        isMounted = false;
      };
    }
    fetchPublicSalons(supabase)
      .then((data) => {
        if (isMounted) setSalons(data);
      })
      .catch((err) => {
        console.warn('Salons fetch notice:', err?.message || err);
        if (isMounted) setSalons([]);
      })
      .finally(() => {
        if (isMounted) setSalonsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

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

  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    if (!supabase || !user) {
      setFavorites([]);
      return;
    }

    const fetchFavorites = async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('salon_id')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching favorites:', error);
      } else {
        setFavorites(data?.map((f: any) => f.salon_id) || []);
      }
    };

    fetchFavorites();

    const favSub = supabase
      .channel('public:favorites')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'favorites', filter: `user_id=eq.${user.id}` },
        () => fetchFavorites()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(favSub);
    };
  }, [user?.id]);

  const handleToggleFavorite = async (salonId: string) => {
    if (!supabase || !user) return;

    const isFav = favorites.includes(salonId);

    if (isFav) {
      // Optimistic update
      setFavorites(prev => prev.filter(id => id !== salonId));
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('salon_id', salonId);
    } else {
      // Optimistic update
      setFavorites(prev => [...prev, salonId]);
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, salon_id: salonId });
    }
  };

  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setRecentlyViewed((profile as any).recently_viewed || []);
    }
  }, [profile?.updated_at]);

  const [favoriteProfessionals, setFavoriteProfessionals] = useState<SavedProfessional[]>([]);
  const [favoriteServices, setFavoriteServices] = useState<SavedService[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (!supabase || !user) {
      setBookings([]);
      return;
    }

    const fetchBookings = async () => {
      // In a real app, you'd fetch from a 'bookings' table. 
      // The current app uses RPC to create them. 
      // I'll assume a 'bookings' table exists for syncing.
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        // Map DB rows to UI Booking type
        setBookings(data.map((b: any) => ({
           id: b.id,
           salonId: b.salon_id,
           salonName: b.salon_name,
           services: b.services || [],
           totalAmount: b.total_amount_paise / 100,
           dateStr: b.date_str,
           timeSlot: b.time_slot,
           status: b.status,
           staffName: b.staff_name,
           locationArea: b.location_area,
           createdTime: new Date(b.created_at).getTime()
        })));
      }
    };

    fetchBookings();

    const bookingsSub = supabase
      .channel('public:bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `customer_id=eq.${user.id}` },
        () => fetchBookings()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(bookingsSub);
    };
  }, [user?.id]);

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
    return [];
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

  // Sync state to localStorage - REMOVED for unified database sync
  /*
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
  */

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

  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  useEffect(() => {
    if (profile) {
      setRecentlyViewed((profile as any).recently_viewed || []);
    }
  }, [profile?.updated_at]);

  const handleSelectSalon = async (salon: Salon) => {
    setSelectedSalon(salon);
    setSelectedServices(salon.services.length > 0 ? [salon.services[0]] : []);
    setSelectedStaff(salon.staff.length > 0 ? salon.staff[0] : null);
    
    if (user && profile) {
      const newRecentlyViewed = [salon.id, ...recentlyViewed.filter(id => id !== salon.id)].slice(0, 10);
      setRecentlyViewed(newRecentlyViewed);
      
      // Sync to DB immediately for cross-device visibility
      await supabase?.from('profiles').update({
        recently_viewed: newRecentlyViewed,
        updated_at: new Date().toISOString()
      }).eq('id', user.id);
    }
    
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

  const handleConfirmBooking = async (bookingData: {
    salon: Salon;
    services: Service[];
    totalAmount: number;
    dateStr: string;
    timeSlot: string;
    appointmentStart: Date;
    staffName?: string;
    customerNote?: string;
  }): Promise<Booking> => {
    if (!supabase) {
      throw new Error('Booking is unavailable because the app is not configured.');
    }
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.access_token) {
      throw new Error('Your customer session expired. Please log in again to continue booking.');
    }

    // Real pipeline (mirrors main-website, already live in production):
    //   1) create booking via audited RPC (server validates role/salon/services)
    const bookingId = await createCustomerBooking(supabase, {
      salonId: bookingData.salon.id,
      serviceIds: bookingData.services.map((s) => s.id),
      staffId: null,
      appointmentStart: bookingData.appointmentStart,
      customerNote: bookingData.customerNote,
    });
    //   2) secure advance order — amount is computed SERVER-side (25%)
    const order = await createAdvanceOrder(supabase, session.access_token, bookingId);
    //   3) open the real Razorpay checkout window (UPI apps / QR scan supported)
    await loadRazorpayCheckout();
    openRazorpayAdvanceCheckout(order, session.user?.email ?? '', {
      // Razorpay fires this only after a successful payment — moves the
      // tracker to the interim "received, confirming…" stage (NOT final confirm;
      // the server/webhook stays the authority).
      onPaymentSuccess: () => {
        setPaymentWatch((prev) =>
          prev ? { ...prev, paymentSubmitted: true } : prev,
        );
      },
    });

    const newBooking: Booking = {
      id: bookingId,
      salonId: bookingData.salon.id,
      salonName: bookingData.salon.name,
      services: bookingData.services,
      totalAmount: bookingData.totalAmount,
      dateStr: bookingData.dateStr,
      timeSlot: bookingData.timeSlot,
      status: 'payment_pending',
      staffName: bookingData.staffName,
      locationArea: bookingData.salon.area,
      createdTime: Date.now(),
    };

    setBookings((prev) => [newBooking, ...prev]);
    // Start live in-app payment tracking for this booking (QR/UPI flow).
    setPaymentWatch({
      bookingId: newBooking.id,
      salonName: newBooking.salonName,
      paymentSubmitted: false,
    });
    setCurrentScreen('bookings');
    return newBooking;
  };

  // Called by PaymentStatusTracker ONLY when the bookings row itself proves payment.
  const handlePaymentProven = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: 'CONFIRMED' as Booking['status'] } : b,
      ),
    );
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
      case 'owner-dashboard':
        return 'Owner Dashboard';
      case 'gp-dashboard':
        return 'Partner Dashboard';
      case 'terms':
        return 'Terms & Conditions';
      case 'privacy':
        return 'Privacy Policy';
      case 'cancellation':
        return 'Refund Policy';
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
    currentScreen === 'settings' ||
    currentScreen === 'terms' ||
    currentScreen === 'privacy' ||
    currentScreen === 'cancellation';
  const unreadCount = notifications.filter((n) => !n.read).length;

  if (supabaseConfigError) {
    return (
      <div className="min-h-screen bg-[#fff8f8] text-[#26181c] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <span className="material-symbols-outlined mb-3 text-4xl text-rose-600">settings_alert</span>
          <h1 className="mb-2 text-xl font-bold">Configuration required</h1>
          <p className="text-sm leading-6 text-[#5a3f47]">{supabaseConfigError}</p>
        </div>
      </div>
    );
  }

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
              salonsLoading={salonsLoading}
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
              salonsLoading={salonsLoading}
              favorites={favorites}
              userCity={userLocation.city}
              onToggleFavorite={handleToggleFavorite}
              onSelectSalon={handleSelectSalon}
              onBack={() => setCurrentScreen('home')}
            />
          )}

          {currentScreen === 'salon-detail' && selectedSalon && (
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

          {currentScreen === 'checkout' && selectedSalon && (
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
              onTrackPayment={(booking) =>
                setPaymentWatch({
                  bookingId: booking.id,
                  salonName: booking.salonName,
                  paymentSubmitted: false,
                })
              }
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

          {currentScreen === 'rewards' && <RewardsScreen profile={profile} bookings={bookings} />}

          {currentScreen === 'profile' && (
            <ProfileScreen
              profile={profile}
              location={userLocation}
              favoritesCount={favorites.length}
              bookings={bookings}
              onNavigate={(s) => setCurrentScreen(s)}
              onBack={handleBack}
              onOpenLocation={() => setCurrentScreen('location-modal')}
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
              profile={profile}
              onBack={handleBack}
              onNavigate={(s) => setCurrentScreen(s)}
              onLogout={async () => {
                setUser(null);
                await supabase?.auth.signOut();
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

          {currentScreen === 'owner-dashboard' && (
            <OwnerDashboard 
              user={user} 
              onNavigate={setCurrentScreen}
              onLogout={async () => {
                setUser(null);
                await supabase?.auth.signOut();
              }}
            />
          )}

          {currentScreen === 'gp-dashboard' && (
            <GrowthPartnerDashboard 
              user={user} 
              onNavigate={setCurrentScreen}
              onLogout={async () => {
                setUser(null);
                await supabase?.auth.signOut();
              }}
            />
          )}

          {currentScreen === 'terms' && (
            <LegalScreen type="terms" onBack={handleBack} />
          )}

          {currentScreen === 'privacy' && (
            <LegalScreen type="privacy" onBack={handleBack} />
          )}

          {currentScreen === 'cancellation' && (
            <LegalScreen type="cancellation" onBack={handleBack} />
          )}

          {/* Safe Fallback for any unhandled screen state to prevent white screen */}
              {!['welcome', 'home', 'search', 'salon-detail', 'checkout', 'bookings', 'favourites', 'rewards', 'profile', 'saved-addresses', 'support', 'settings', 'location-modal'].includes(currentScreen) && (
                <HomeScreen
                  location={userLocation}
                  salons={salons}
                  salonsLoading={salonsLoading}
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
        {paymentWatch && (
          <PaymentStatusTracker
            bookingId={paymentWatch.bookingId}
            salonName={paymentWatch.salonName}
            paymentSubmitted={paymentWatch.paymentSubmitted}
            onConfirmed={handlePaymentProven}
            onClose={() => setPaymentWatch(null)}
          />
        )}

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
              // Native prompt not available yet — keep the modal's manual
              // installation guide visible; never fake an install success.
              console.log('beforeinstallprompt not fired yet; showing manual guide');
              setIsPwaDismissedPermanently(localStorage.getItem('nexora_pwa_dismissed') === 'true');
              return;
            }
            setIsPwaDismissedPermanently(localStorage.getItem('nexora_pwa_dismissed') === 'true');
            setIsInstallModalOpen(false);
          }} 
        />
      </Modal>
    </div>
  );
}

