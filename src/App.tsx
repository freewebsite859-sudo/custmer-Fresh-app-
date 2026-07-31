import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, supabaseConfigError } from './lib/supabaseClient';
import { Screen, Salon, Service, Staff, Booking, UserLocation, AppNotification, ServiceReview, SavedProfessional, SavedService } from './types';
import {
  INITIAL_LOCATION,
} from './data/mockData';
import { fetchPublicSalons } from './lib/salonRepository';
import { createCustomerBooking, createAdvanceOrder, loadRazorpayCheckout, openRazorpayAdvanceCheckout, listCustomerBookings, subscribeToCustomerBookings, CustomerBookingRow } from './lib/bookingRepository';
import { loadProfile, waitForProfile, updateProfile, uploadAvatar, avatarUrlWithVersion, subscribeToProfile, CustomerProfile, ProfilePatch } from './lib/profileRepository';
import { loadFavorites, setFavorite, subscribeToFavorites } from './lib/favoritesRepository';
import { loadSettings, saveSettings, settingsFromLegacyLocalStorage, SETTINGS_DEFAULTS } from './lib/settingsRepository';
import { loadAddresses, importLegacyAddresses } from './lib/addressesRepository';
import { loadPaymentMethods, importLegacyPaymentMethods, addUpiMethod } from './lib/paymentMethodsRepository';
import { loadServerNotifications, subscribeToServerNotifications } from './lib/serverNotifications';
import { purgeLegacyLocalStorage, readLegacyJson, readLegacyValue, LEGACY_MIGRATION_FLAG } from './lib/legacyLocalData';
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
import { dashboardScreenForRole, isPlatformRole } from './lib/authRoles';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'signup' | 'role-conflict'>('login');
  const [conflictRole, setConflictRole] = useState<string | null>(null);

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

  useEffect(() => {
    let isMounted = true;

    if (!supabase) {
      setAuthLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const client = supabase;

    const verifyPlatformAccess = async (
      authUser: { id: string }
    ): Promise<{ allowed: boolean; role: string | null; profile: CustomerProfile | null }> => {
      const prof = await waitForProfile(client, authUser.id, { attempts: 6, delayMs: 350 });
      if (!prof) return { allowed: false, role: null, profile: null };

      if (prof.is_active === true && isPlatformRole(prof.platform_role)) {
        return { allowed: true, role: prof.platform_role, profile: prof };
      }
      return { allowed: false, role: prof.platform_role || 'inactive', profile: prof };
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

      const { allowed, role, profile: resolvedProfile } = await verifyPlatformAccess(authUser);
      if (!isMounted) return;

      if (allowed && role && isPlatformRole(role)) {
        setConflictRole(null);
        setProfile(resolvedProfile);
        setUser({ ...authUser, role });
        const nextScreen = dashboardScreenForRole(role);
        if (nextScreen !== 'home') setCurrentScreen(nextScreen);
      } else {
        setUser(null);
        setProfile(null);
        setConflictRole(role);
        setAuthScreen('role-conflict');
        await client.auth.signOut();
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
        })
        .catch((err) => {
          console.warn('Supabase auth notice:', err?.message || err);
          if (isMounted) {
            setUser(null);
            setAuthLoading(false);
          }
        });

      const { data } = client.auth.onAuthStateChange((_event, session) => {
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
        setAuthLoading(false);
      }
    }
  }, []);

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

  // Favourites + profile + bookings come from Supabase (single source of
  // truth). They hydrate after login and stay live via Realtime channels.
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteServiceIds, setFavoriteServiceIds] = useState<string[]>([]);
  const [favoriteStaffIds, setFavoriteStaffIds] = useState<string[]>([]);

  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  useEffect(() => {
    setRecentlyViewed(profile?.recently_viewed ?? []);
  }, [profile?.recently_viewed, profile?.updated_at]);

  // Resolved against the live salon catalogue before rendering.
  const favoriteProfessionals: SavedProfessional[] = favoriteStaffIds.flatMap((staffId) => {
    for (const salon of salons) {
      const staffMember = salon.staff.find((s) => s.id === staffId);
      if (staffMember) {
        return [{
          id: staffMember.id,
          salonId: salon.id,
          name: staffMember.name,
          role: staffMember.role,
          rating: staffMember.rating,
          avatar: staffMember.avatar,
          salonName: salon.name,
          skills: [],
        }];
      }
    }
    return [];
  });

  const favoriteServices: SavedService[] = favoriteServiceIds.flatMap((serviceId) => {
    for (const salon of salons) {
      const service = salon.services.find((s) => s.id === serviceId);
      if (service) {
        return [{
          id: service.id,
          salonId: salon.id,
          name: service.name,
          durationMinutes: service.durationMinutes,
          price: service.price,
          salonName: salon.name,
          category: service.category,
        }];
      }
    }
    return [];
  });

  // Server bookings are the authority. localOnlyBookings only bridges the
  // instant between creating a booking and the next server refresh.
  const [serverBookingRows, setServerBookingRows] = useState<CustomerBookingRow[]>([]);
  const [serverBookingItems, setServerBookingItems] = useState<Record<string, string[]>>({});
  const [localOnlyBookings, setLocalOnlyBookings] = useState<Booking[]>([]);
  const [reviewedBookingIds, setReviewedBookingIds] = useState<string[]>([]);

  const mapServerStatus = (status: string | null): Booking['status'] => {
    const s = (status ?? '').toLowerCase();
    if (s.includes('cancel') || s.includes('no_show') || s.includes('noshow')) return 'CANCELLED';
    if (s.includes('complete') || s === 'done' || s.includes('served')) return 'COMPLETED';
    if (s.includes('confirm') || s.includes('paid') || s.includes('success') || s.includes('capture')) return 'CONFIRMED';
    if (s.includes('payment_pending') || s.includes('await') || s.includes('unpaid')) return 'payment_pending';
    return 'PENDING';
  };

  const bookings: Booking[] = (() => {
    const mapped: Booking[] = serverBookingRows.map((row) => {
      const salon = salons.find((s) => s.id === row.salon_id);
      const serviceIds = serverBookingItems[row.id] ?? [];
      const services: Service[] = serviceIds.map((serviceId) => {
        const found = salon?.services.find((s) => s.id === serviceId);
        return found ?? { id: serviceId, name: 'Salon service', durationMinutes: 0, price: 0, category: '' };
      });
      const start = row.appointment_start ? new Date(row.appointment_start) : null;
      const validStart = start && !Number.isNaN(start.valueOf()) ? start : null;
      return {
        id: row.id,
        salonId: row.salon_id,
        salonName: salon?.name ?? 'Salon',
        services,
        totalAmount: (row.total_paise ?? 0) / 100,
        dateStr: validStart
          ? validStart.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
          : '',
        timeSlot: validStart
          ? validStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : '',
        status: mapServerStatus(row.status),
        locationArea: salon?.area ?? '',
        createdTime: row.created_at ? Date.parse(row.created_at) : Date.now(),
        isReviewed: reviewedBookingIds.includes(row.id) || undefined,
      };
    });
    const serverIds = new Set(mapped.map((b) => b.id));
    const pending = localOnlyBookings
      .filter((b) => !serverIds.has(b.id))
      .map((b) => reviewedBookingIds.includes(b.id) ? { ...b, isReviewed: true } : b);
    return [...pending, ...mapped];
  })();

  const setBookings = (updater: (prev: Booking[]) => Booking[]) => {
    // Local-only mutations (e.g. cancel/review flags applied pre-refresh).
    setLocalOnlyBookings((prevLocal) => {
      const current = [...prevLocal];
      return updater(current).filter((b) => !serverBookingRows.some((r) => r.id === b.id));
    });
  };

  const [confirmedModalBooking, setConfirmedModalBooking] = useState<Booking | null>(null);
  const [initialBookingIdForBookings, setInitialBookingIdForBookings] = useState<string | undefined>(undefined);

  // Notifications: server rows hydrate after login; local entries are only
  // ephemeral device notices (install/sync), never persisted as truth.
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const [activePushOverlay, setActivePushOverlay] = useState<AppNotification | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);

  // ---- Server refresh helpers (used by bootstrap + realtime callbacks) ----
  const refreshFavorites = React.useCallback(async () => {
    if (!supabase || !user) return;
    try {
      const f = await loadFavorites(supabase, user.id);
      setFavorites(f.salonIds);
      setFavoriteServiceIds(f.serviceIds);
      setFavoriteStaffIds(f.staffIds);
    } catch (e: any) {
      console.warn('Favourites sync notice:', e?.message || e);
    }
  }, [user?.id]);

  const refreshBookings = React.useCallback(async () => {
    if (!supabase || !user) return;
    try {
      const { bookings: rows, serviceIdsByBooking } = await listCustomerBookings(supabase, user.id);
      setServerBookingRows(rows);
      setServerBookingItems(serviceIdsByBooking);
    } catch (e: any) {
      console.warn('Bookings sync notice:', e?.message || e);
    }
  }, [user?.id]);

  // ---- Unified bootstrap: hydrate profile/favourites/bookings/notifications,
  //      run the one-time legacy-localStorage migration, then subscribe. ----
  useEffect(() => {
    if (!supabase || !user) return;
    const client = supabase;
    const uid: string = user.id;
    let cancelled = false;
    const unsubs: Array<() => void> = [];

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    (async () => {
      try {
        // 1) Hydrate profile (header avatar + profile screens)
        let prof: CustomerProfile | null = null;
        try { prof = await loadProfile(client, uid); } catch (e: any) { console.warn('Profile load notice:', e?.message || e); }
        if (cancelled) return;
        setProfile(prof);

        // 2) One-time migrate-up of pre-unification localStorage values,
        //    then purge the local copies (Supabase becomes the only truth).
        const alreadyMigrated = readLegacyValue(LEGACY_MIGRATION_FLAG) === 'done';
        if (!alreadyMigrated) {
          try {
            if (prof) {
              // Import only genuinely user-entered values; never import the
              // old fabricated persona defaults.
              const patch: ProfilePatch = {};
              const legacyName = readLegacyValue('profile_name');
              if (!prof.full_name && legacyName && legacyName !== 'Customer') patch.full_name = legacyName;
              const legacyPhone = readLegacyValue('profile_phone');
              if (!prof.phone && legacyPhone && legacyPhone !== '+91 98765 43210') patch.phone = legacyPhone;
              const legacyDob = readLegacyValue('profile_dob');
              if (!prof.date_of_birth && legacyDob && legacyDob !== '1992-05-14') patch.date_of_birth = legacyDob;
              const legacyGender = readLegacyValue('profile_gender');
              if (!prof.gender && legacyGender) patch.gender = legacyGender;
              const legacyCity = readLegacyValue('profile_city');
              if (!prof.preferred_city && legacyCity) patch.preferred_city = legacyCity;
              const legacyArea = readLegacyValue('profile_area');
              if (!prof.preferred_area && legacyArea) patch.preferred_area = legacyArea;
              if (Object.keys(patch).length > 0) {
                prof = await updateProfile(client, uid, patch);
                if (!cancelled) setProfile(prof);
              }
            }
            // settings row
            try {
              const { exists } = await loadSettings(client, uid);
              if (!exists) {
                const legacy = settingsFromLegacyLocalStorage(readLegacyValue);
                await saveSettings(client, uid, { ...SETTINGS_DEFAULTS, ...legacy });
              }
            } catch (e: any) { console.warn('Settings migration notice:', e?.message || e); }
            // favourites
            const legacySalonFavs = readLegacyJson<string[]>('nexora_favorites') ?? [];
            const legacyProFavs = (readLegacyJson<Array<{ id: string }>>('nexora_favorite_pros') ?? []).map((p) => p?.id).filter(Boolean) as string[];
            const legacyServiceFavs = (readLegacyJson<Array<{ id: string }>>('nexora_favorite_services') ?? []).map((s) => s?.id).filter(Boolean) as string[];
            for (const id of legacySalonFavs.filter((x) => UUID_RE.test(x))) {
              await setFavorite(client, uid, 'salon', id, true).catch(() => undefined);
            }
            for (const id of legacyProFavs.filter((x) => UUID_RE.test(x))) {
              await setFavorite(client, uid, 'staff', id, true).catch(() => undefined);
            }
            for (const id of legacyServiceFavs.filter((x) => UUID_RE.test(x))) {
              await setFavorite(client, uid, 'service', id, true).catch(() => undefined);
            }
            // addresses
            try {
              const serverAddrs = await loadAddresses(client, uid);
              const legacyAddrs = readLegacyJson<Array<any>>('nexora_saved_addresses') ?? [];
              const realAddrs = legacyAddrs.filter((a) => a && typeof a.id === 'string' && !a.id.startsWith('addr-'));
              if (serverAddrs.length === 0 && realAddrs.length > 0) {
                await importLegacyAddresses(client, uid, realAddrs);
              }
            } catch (e: any) { console.warn('Address migration notice:', e?.message || e); }
            // payment methods
            try {
              const existing = await loadPaymentMethods(client, uid);
              const legacyUpis = (readLegacyJson<Array<any>>('nexora_saved_upis') ?? []).filter((u) => u && typeof u.id === 'string' && !u.id.startsWith('upi-'));
              const legacyCards = (readLegacyJson<Array<any>>('nexora_saved_cards') ?? []).filter((c) => c && typeof c.id === 'string' && !c.id.startsWith('card-'));
              if (existing.upis.length === 0 && existing.cards.length === 0 && (legacyUpis.length || legacyCards.length)) {
                await importLegacyPaymentMethods(client, uid, legacyUpis, legacyCards);
              }
            } catch (e: any) { console.warn('Payment-method migration notice:', e?.message || e); }
          } catch (e: any) {
            console.warn('Legacy migration notice:', e?.message || e);
          }
          try { localStorage.setItem(LEGACY_MIGRATION_FLAG, 'done'); } catch { /* storage unavailable */ }
          purgeLegacyLocalStorage();
        }

        // 3) Hydrate favourites / bookings / notifications from the server
        await Promise.all([refreshFavorites(), refreshBookings()]);
        try {
          const serverNotifs = await loadServerNotifications(client, uid);
          if (!cancelled) {
            setNotifications((prev) => {
              const localEphemeral = prev.filter((n) => !n.id.startsWith('srv-'));
              return [...serverNotifs, ...localEphemeral];
            });
          }
        } catch (e: any) {
          console.warn('Notifications sync notice:', e?.message || e);
        }

        // 4) Realtime subscriptions (task STEP 6)
        if (!cancelled) {
          unsubs.push(subscribeToProfile(client, uid, (p) => setProfile(p)));
          unsubs.push(subscribeToFavorites(client, uid, refreshFavorites));
          unsubs.push(subscribeToCustomerBookings(client, uid, refreshBookings));
          unsubs.push(subscribeToServerNotifications(client, uid, (n) => {
            setNotifications((prev) => [n, ...prev.filter((x) => x.id !== n.id)]);
          }));
        }
      } catch (e: any) {
        console.warn('Account bootstrap notice:', e?.message || e);
      }
    })();

    return () => {
      cancelled = true;
      unsubs.forEach((unsub) => unsub());
    };
  }, [user?.id, refreshFavorites, refreshBookings]);

  // Profile write handlers shared with screens (UPDATE-only; task STEP 10)
  const handleSaveProfile = React.useCallback(async (patch: ProfilePatch): Promise<boolean> => {
    if (!supabase || !user) return false;
    try {
      const updated = await updateProfile(supabase, user.id, patch);
      setProfile(updated);
      return true;
    } catch (e: any) {
      console.warn('Profile save notice:', e?.message || e);
      return false;
    }
  }, [user?.id]);

  const handleUploadAvatar = React.useCallback(async (file: File): Promise<boolean> => {
    if (!supabase || !user) return false;
    try {
      const updated = await uploadAvatar(supabase, user.id, file);
      setProfile(updated);
      return true;
    } catch (e: any) {
      console.warn('Avatar upload notice:', e?.message || e);
      return false;
    }
  }, [user?.id]);

  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // 1. Listen for BroadcastChannel messages from SW
    const syncChannel = new BroadcastChannel('app-sync');
    syncChannel.onmessage = (event) => {
      if (event.data.type === 'SYNC_COMPLETE') {
        console.log('Sync complete received from SW', event.data);
        setIsSyncing(false);
        // sw.js no longer injects booking data; the server refresh is the truth.
        void refreshBookings();

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
  }, [refreshBookings]);

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

    if (!isAppInstalled && !isStandalone && !hasDismissedInSession && !isPwaDismissedPermanently) {
      const timer = setTimeout(() => {
        setIsInstallModalOpen(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAppInstalled, hasDismissedInSession, isPwaDismissedPermanently]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsAppInstalled(true);
      localStorage.setItem('nexora_app_installed', 'true');
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

  useEffect(() => {
    localStorage.setItem('nexora_user_location', JSON.stringify(userLocation));
  }, [userLocation]);

  // Favourites: optimistic local toggle + Supabase write; Realtime keeps
  // every logged-in device in sync (task STEPS 6/7).
  const handleToggleFavorite = (salonId: string) => {
    const willFavorite = !favorites.includes(salonId);
    setFavorites((prev) =>
      willFavorite ? [...prev, salonId] : prev.filter((id) => id !== salonId)
    );
    if (supabase && user) {
      setFavorite(supabase, user.id, 'salon', salonId, willFavorite).catch((e) => {
        console.warn('Favourite write notice:', e?.message || e);
        // revert on failure
        setFavorites((prev) =>
          willFavorite ? prev.filter((id) => id !== salonId) : [...prev, salonId]
        );
      });
    }
  };

  const handleRemoveFavoriteProfessional = (proId: string) => {
    setFavoriteStaffIds((prev) => prev.filter((id) => id !== proId));
    if (supabase && user) {
      setFavorite(supabase, user.id, 'staff', proId, false).catch((e) => {
        console.warn('Favourite write notice:', e?.message || e);
        setFavoriteStaffIds((prev) => [...prev, proId]);
      });
    }
  };

  const handleRemoveFavoriteService = (servId: string) => {
    setFavoriteServiceIds((prev) => prev.filter((id) => id !== servId));
    if (supabase && user) {
      setFavorite(supabase, user.id, 'service', servId, false).catch((e) => {
        console.warn('Favourite write notice:', e?.message || e);
        setFavoriteServiceIds((prev) => [...prev, servId]);
      });
    }
  };

  const handleSelectSalon = async (salon: Salon) => {
    setSelectedSalon(salon);
    setSelectedServices(salon.services.length > 0 ? [salon.services[0]] : []);
    setSelectedStaff(salon.staff.length > 0 ? salon.staff[0] : null);

    if (supabase && user) {
      const newRecentlyViewed = [salon.id, ...recentlyViewed.filter((id) => id !== salon.id)].slice(0, 10);
      setRecentlyViewed(newRecentlyViewed);
      updateProfile(supabase, user.id, { recently_viewed: newRecentlyViewed }).catch((e: any) => {
        console.warn('Recently viewed sync notice:', e?.message || e);
      });
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

    const bookingId = await createCustomerBooking(supabase, {
      salonId: bookingData.salon.id,
      serviceIds: bookingData.services.map((s) => s.id),
      staffId: null,
      appointmentStart: bookingData.appointmentStart,
      customerNote: bookingData.customerNote,
    });
    const order = await createAdvanceOrder(supabase, session.access_token, bookingId);
    await loadRazorpayCheckout();
    openRazorpayAdvanceCheckout(order, session.user?.email ?? '', {
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
    void refreshBookings();
    setPaymentWatch({
      bookingId: newBooking.id,
      salonName: newBooking.salonName,
      paymentSubmitted: false,
    });
    setCurrentScreen('bookings');
    return newBooking;
  };

  const handlePaymentProven = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId ? { ...b, status: 'CONFIRMED' as Booking['status'] } : b,
      ),
    );
    void refreshBookings();
  };

  const handleCancelBooking = (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: 'CANCELLED' } : b))
    );
  };

  const handleMarkBookingReviewed = (bookingId: string) => {
    setReviewedBookingIds((prev) => (prev.includes(bookingId) ? prev : [...prev, bookingId]));
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

  const triggerPushNotificationForBooking = (bookingId?: string) => {
    const targetBooking = bookingId
      ? bookings.find((booking) => booking.id === bookingId)
      : bookings.find((booking) => booking.status === 'CONFIRMED' || booking.status === 'PENDING');

    if (!targetBooking) return;

    const alertNotification: AppNotification = {
      id: `local-reminder-${targetBooking.id}-${Date.now()}`,
      bookingId: targetBooking.id,
      salonName: targetBooking.salonName,
      timeSlot: targetBooking.timeSlot,
      dateStr: targetBooking.dateStr,
      servicesSummary: targetBooking.services.map((service) => service.name).join(', '),
      timestamp: Date.now(),
      read: false,
      type: 'reminder_1h',
      message: `${targetBooking.salonName} starts at ${targetBooking.timeSlot} on ${targetBooking.dateStr}. ${targetBooking.services.map((service) => service.name).join(', ')} is ready to go.`,
    };

    setNotifications((prev) => [alertNotification, ...prev]);
    setActivePushOverlay(alertNotification);

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification('Nexora appointment reminder', {
          body: alertNotification.message,
          icon: '/favicon.ico',
          tag: `booking-reminder-${targetBooking.id}`,
        });
        browserNotification.onclick = () => {
          window.focus();
          setCurrentScreen('bookings');
        };
      } catch (error) {
        console.warn('Browser notification notice:', error);
      }
    }
  };

  const handleSnoozeNotification = (id: string) => {
    setActivePushOverlay(null);
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
      <NotificationOverlay
        notification={activePushOverlay}
        onDismiss={() => setActivePushOverlay(null)}
        onSnooze={handleSnoozeNotification}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />

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
            userAvatar={avatarUrlWithVersion(profile)}
            isSyncing={isSyncing}
          />
        )}

      <div className="w-full flex-1 flex flex-col relative">
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
              customerName={profile?.full_name ?? ''}
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
              customerName={profile?.full_name ?? ''}
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
              onToggleFavoriteProfessional={handleRemoveFavoriteProfessional}
              onToggleFavoriteService={handleRemoveFavoriteService}
              onSelectSalon={handleSelectSalon}
              onNavigate={(s) => setCurrentScreen(s)}
            />
          )}

          {currentScreen === 'rewards' && <RewardsScreen profile={profile} bookings={bookings} customerName={profile?.full_name ?? ''} />}

          {currentScreen === 'profile' && (
            <ProfileScreen
              profile={profile}
              location={userLocation}
              favoritesCount={favorites.length}
              bookings={bookings}
              onNavigate={(s) => setCurrentScreen(s)}
              onBack={handleBack}
              onOpenLocation={() => setCurrentScreen('location-modal')}
              customerId={user.id}
              onSaveProfile={(patch) => handleSaveProfile(patch)}
              onUploadAvatar={handleUploadAvatar}
            />
          )}

          {currentScreen === 'saved-addresses' && (
            <SavedAddressesScreen
              onBack={handleBack}
              onNavigate={(s) => setCurrentScreen(s)}
              customerId={user.id}
            />
          )}

          {currentScreen === 'support' && (
            <SupportScreen
              onBack={handleBack}
              onNavigate={(s) => setCurrentScreen(s)}
              customerId={user.id}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsScreen
              profile={profile}
              onBack={handleBack}
              onNavigate={(s) => setCurrentScreen(s)}
              customerId={user.id}
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

          {!['welcome', 'home', 'search', 'salon-detail', 'checkout', 'bookings', 'favourites', 'rewards', 'profile', 'saved-addresses', 'support', 'settings', 'location-modal', 'owner-dashboard', 'gp-dashboard', 'terms', 'privacy', 'cancellation'].includes(currentScreen) && (
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

      <ScanUpiQrModal
        isOpen={isGlobalScanQrOpen}
        onClose={() => setIsGlobalScanQrOpen(false)}
        onUpiScanned={(scannedUpi) => {
          if (supabase && user) {
            addUpiMethod(supabase, user.id, scannedUpi).catch((e) =>
              console.warn('UPI save notice:', e?.message || e),
            );
          }
          setIsGlobalScanQrOpen(false);
          setCurrentScreen('profile');
        }}
        onUpiParsed={(parsedUpiId) => {
          setGlobalPrefilledUpi(parsedUpiId);
          setIsGlobalScanQrOpen(false);
          setIsGlobalAddUpiOpen(true);
        }}
      />

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
          if (supabase && user) {
            addUpiMethod(supabase, user.id, newUpi).catch((e) =>
              console.warn('UPI save notice:', e?.message || e),
            );
          }
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
