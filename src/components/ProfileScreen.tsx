import React, { useState, useEffect } from 'react';
import { JAIPUR_LOCATIONS } from '../data/locations';
import { supabase } from '../lib/supabaseClient';
import { Screen, UserLocation, Booking, Address } from '../types';
import { CustomerProfile, ProfilePatch, avatarUrlWithVersion } from '../lib/profileRepository';
import {
  loadPaymentMethods, addUpiMethod, addCardMethod, deletePaymentMethod, subscribeToPaymentMethods,
} from '../lib/paymentMethodsRepository';
import {
  loadAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress, subscribeToAddresses,
} from '../lib/addressesRepository';
import {
  CustomerSettings, SETTINGS_DEFAULTS, loadSettings, saveSettings, subscribeToSettings,
} from '../lib/settingsRepository';
import { submitFeedback } from '../lib/supportRepository';
import { AddCardModal, SavedCard } from './AddCardModal';
import { AddUpiModal, SavedUpi } from './AddUpiModal';
import { ScanUpiQrModal } from './ScanUpiQrModal';
import { RecentlyScannedUpiList } from './RecentlyScannedUpiList';
import { InstallApp } from './InstallApp';
import { Modal } from './Modal';

interface ProfileScreenProps {
  location: UserLocation;
  favoritesCount: number;
  bookings: Booking[];
  onNavigate: (screen: Screen) => void;
  onBack?: () => void;
  onOpenLocation: () => void;
  customerId?: string;
  profile?: CustomerProfile | null;
  onSaveProfile?: (patch: ProfilePatch) => Promise<boolean>;
  onUploadAvatar?: (file: File) => Promise<boolean>;
}

interface MenuItemProps {
  icon: string;
  label: string;
  badge?: string | number;
  onClick: () => void;
  isDestructive?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, label, badge, onClick, isDestructive }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center justify-between p-3.5 hover:bg-[#fff0f2] active:bg-[#fde7f3] transition-colors text-left border-b border-[#e8e8e8]/50 last:border-b-0 cursor-pointer"
  >
    <div className="flex items-center gap-3">
      <span className={`material-symbols-outlined text-[20px] ${isDestructive ? 'text-red-500' : 'text-[#e6007e]'}`}>
        {icon}
      </span>
      <span className={`text-[14px] font-semibold ${isDestructive ? 'text-red-600' : 'text-[#26181c]'}`}>
        {label}
      </span>
    </div>
    <div className="flex items-center gap-1.5">
      {badge ? (
        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#fde7f3] text-[#e6007e] border border-[#fcd5e8]">
          {badge}
        </span>
      ) : null}
      <span className="material-symbols-outlined text-[#8c7077] text-[18px]">chevron_right</span>
    </div>
  </button>
);

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  location,
  favoritesCount,
  bookings,
  onNavigate,
  onBack,
  onOpenLocation,
  customerId,
  profile,
  onSaveProfile,
  onUploadAvatar,
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Profile fields hydrate from the shared `profiles` row (Supabase = truth).
  // Empty strings mean "not set yet" — no fabricated persona values.
  const [name, setName] = useState<string>(profile?.full_name ?? '');
  const [email, setEmail] = useState<string>(profile?.email ?? '');
  const [phone, setPhone] = useState<string>(profile?.phone ?? '');
  const [avatar, setAvatar] = useState<string>(avatarUrlWithVersion(profile ?? null));

  // Settings (language/theme/reminders/ambience) sync via customer_settings.
  const [settings, setSettings] = useState<CustomerSettings>(SETTINGS_DEFAULTS);
  const selectedLanguage = settings.language === 'hindi' ? 'Hindi' : 'English';
  const remindersEnabled = settings.appointment_reminders;
  const autoPlayAmbiance = settings.autoplay_ambiance;
  const themeMode: 'light' | 'dark' = settings.display_mode === 'dark' ? 'dark' : 'light';

  // Custom high fidelity profile details states
  const [dob, setDob] = useState<string>(profile?.date_of_birth ?? '');
  const [gender, setGender] = useState<string>(profile?.gender ?? '');
  const [preferredCity, setPreferredCity] = useState<string>(profile?.preferred_city ?? 'jaipur');
  const [preferredArea, setPreferredArea] = useState<string>(profile?.preferred_area ?? '');

  // Re-hydrate whenever the shared profile row changes (login, own save,
  // or a Realtime push from another device).
  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name ?? '');
    setEmail(profile.email ?? '');
    setPhone(profile.phone ?? '');
    setAvatar(avatarUrlWithVersion(profile));
    setDob(profile.date_of_birth ?? '');
    setGender(profile.gender ?? '');
    if (profile.preferred_city) setPreferredCity(profile.preferred_city);
    if (profile.preferred_area !== null) setPreferredArea(profile.preferred_area ?? '');
  }, [profile]);

  // Settings row hydrate + realtime
  useEffect(() => {
    if (!supabase || !customerId) return;
    let active = true;
    loadSettings(supabase, customerId)
      .then(({ settings: loaded }) => { if (active) setSettings(loaded); })
      .catch((e) => console.warn('Settings load notice:', e?.message || e));
    const unsub = subscribeToSettings(supabase, customerId, (remote) => setSettings(remote));
    return () => { active = false; unsub(); };
  }, [customerId]);

  const applySettings = (next: CustomerSettings) => {
    setSettings(next);
    if (supabase && customerId) {
      saveSettings(supabase, customerId, next).catch((e) =>
        console.warn('Settings save notice:', e?.message || e),
      );
    }
  };

  // Modal open states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReferEarnOpen, setIsReferEarnOpen] = useState(false);
  const [isMembershipOpen, setIsMembershipOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isFaqOpen, setIsFaqOpen] = useState(false);
  const [isPolicyOpen, setIsPolicyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isPaymentMethodsOpen, setIsPaymentMethodsOpen] = useState(false);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [isAddUpiOpen, setIsAddUpiOpen] = useState(false);
  const [isScanQrOpen, setIsScanQrOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [prefilledUpiInput, setPrefilledUpiInput] = useState<string>('');

  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [savedUpis, setSavedUpis] = useState<SavedUpi[]>([]);

  const refreshPaymentMethods = React.useCallback(async () => {
    if (!supabase || !customerId) return;
    try {
      const { upis, cards } = await loadPaymentMethods(supabase, customerId);
      setSavedUpis(upis);
      setSavedCards(cards);
    } catch (e: any) {
      console.warn('Payment methods load notice:', e?.message || e);
    }
  }, [customerId]);

  useEffect(() => {
    void refreshPaymentMethods();
    if (!supabase || !customerId) return;
    const unsubscribe = subscribeToPaymentMethods(supabase, customerId, () => {
      void refreshPaymentMethods();
    });
    return unsubscribe;
  }, [refreshPaymentMethods]);

  const handleCardAdded = (newCard: SavedCard) => {
    if (!supabase || !customerId) return;
    const { id: _localId, ...payload } = newCard;
    addCardMethod(supabase, customerId, payload)
      .then(() => refreshPaymentMethods())
      .then(() => triggerToast('Card saved & synced!'))
      .catch((e) => {
        console.warn('Card save notice:', e?.message || e);
        triggerToast('Could not save the card right now.');
      });
  };

  const handleDeleteCard = (cardId: string) => {
    if (!supabase || !customerId) return;
    deletePaymentMethod(supabase, cardId)
      .then(() => refreshPaymentMethods())
      .then(() => triggerToast('Card removed'))
      .catch((e) => {
        console.warn('Card delete notice:', e?.message || e);
        triggerToast('Could not remove the card right now.');
      });
  };

  const handleUpiAdded = (newUpi: SavedUpi) => {
    if (!supabase || !customerId) return;
    const { id: _localId, ...payload } = newUpi;
    addUpiMethod(supabase, customerId, payload)
      .then(() => refreshPaymentMethods())
      .then(() => triggerToast('UPI ID linked & synced!'))
      .catch((e) => {
        console.warn('UPI save notice:', e?.message || e);
        triggerToast('Could not save the UPI ID right now.');
      });
  };

  const handleDeleteUpi = (upiId: string) => {
    if (!supabase || !customerId) return;
    deletePaymentMethod(supabase, upiId)
      .then(() => refreshPaymentMethods())
      .then(() => triggerToast('UPI ID removed'))
      .catch((e) => {
        console.warn('UPI delete notice:', e?.message || e);
        triggerToast('Could not remove the UPI ID right now.');
      });
  };

  // Feedback State
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackText, setFeedbackText] = useState<string>('');

  const handleSubmitFeedback = () => {
    if (feedbackRating === 0) {
      triggerToast('Please select a star rating.');
      return;
    }
    if (!supabase || !customerId) {
      triggerToast('Feedback needs a signed-in account. Please log in again.');
      return;
    }
    const rating = feedbackRating;
    const text = feedbackText;
    submitFeedback(supabase, customerId, rating, text)
      .then(() => {
        triggerToast('Thank you — your feedback was saved to your account.');
      })
      .catch((e) => {
        console.warn('Feedback save notice:', e?.message || e);
        triggerToast('Could not save feedback right now — please try again.');
      });
    setIsFeedbackOpen(false);
    setFeedbackRating(0);
    setFeedbackText('');
  };

  // Saved Addresses State
  const [isAddressesOpen, setIsAddressesOpen] = useState(false);
  const [addressView, setAddressView] = useState<'list' | 'add' | 'edit'>('list');
  const [selectedAddressForEdit, setSelectedAddressForEdit] = useState<Address | null>(null);

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);

  const refreshAddresses = React.useCallback(async () => {
    if (!supabase || !customerId) return;
    try {
      setSavedAddresses(await loadAddresses(supabase, customerId));
    } catch (e: any) {
      console.warn('Addresses load notice:', e?.message || e);
    }
  }, [customerId]);

  useEffect(() => {
    void refreshAddresses();
    if (!supabase || !customerId) return;
    const unsubscribe = subscribeToAddresses(supabase, customerId, () => {
      void refreshAddresses();
    });
    return unsubscribe;
  }, [refreshAddresses]);

  // Form states for adding/editing addresses
  const [formLabel, setFormLabel] = useState<string>('Home');
  const [formFlat, setFormFlat] = useState<string>('');
  const [formStreet, setFormStreet] = useState<string>('');
  const [formLandmark, setFormLandmark] = useState<string>('');
  const [formCity, setFormCity] = useState<string>('Jaipur');
  const [formPincode, setFormPincode] = useState<string>('');
  const [formIsDefault, setFormIsDefault] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Active support message state
  const [supportMessages, setSupportMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: 'Hi! I am the Nexora automated assistant. Ask me about bookings, payments or your profile.' },
  ]);
  const [supportInput, setSupportInput] = useState('');

  // Toast notification state
  const [toast, setToast] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Handler for saving profile edits
  const handleSaveProfile = async (
    tempName: string,
    tempEmail: string,
    tempPhone: string,
    tempAvatar: string,
    tempDob: string,
    tempGender: string,
    tempCity: string,
    tempArea: string
  ) => {
    if (!tempName.trim()) {
      setNameError('Full Name is required');
      return;
    }
    if (tempName.trim().length < 2) {
      setNameError('Full Name must be at least 2 characters');
      return;
    }
    setNameError(null);
    setIsSavingProfile(true);

    setName(tempName);
    if (!onSaveProfile) {
      setIsSavingProfile(false);
      triggerToast('Profile saving is unavailable right now.');
      return;
    }

    const patch: ProfilePatch = {
      full_name: tempName.trim(),
      phone: tempPhone.trim() || null,
      gender: tempGender.trim() || null,
      date_of_birth: tempDob.trim() || null,
      preferred_city: tempCity,
      preferred_area: tempArea.trim() || null,
    };
    if (tempAvatar && !tempAvatar.startsWith('data:') && tempAvatar !== avatarUrlWithVersion(profile ?? null)) {
      // A new non-uploaded URL only ever comes from an explicit user choice;
      // uploads themselves go through onUploadAvatar (Supabase Storage).
      patch.photo_url = tempAvatar;
    }
    if (!tempAvatar) {
      // User pressed Remove — clear the photo server-side too.
      patch.photo_url = null;
    }

    const synced = await onSaveProfile(patch);

    setIsSavingProfile(false);
    if (synced) {
      setIsEditOpen(false);
      triggerToast('Profile saved & synced to all your devices.');
    } else {
      // Honest failure: revert the optimistic name so the screen never shows
      // data that was not actually saved.
      setName(profile?.full_name ?? '');
      triggerToast('Could not sync the profile — your changes were not saved. Please try again.');
    }
  };

  // Real GPS detection — reverse-geocodes to city/area and fills the form.
  // Honest behaviour: no hardcoded location, explicit messages on failure.
  const handleDetectLocation = () => {
    if (isDetectingLocation) return;
    if (!('geolocation' in navigator)) {
      triggerToast('Geolocation is not supported on this device.');
      return;
    }
    setIsDetectingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (!resp.ok) throw new Error(`geocoder HTTP ${resp.status}`);
          const data = await resp.json();
          const addr = data?.address || {};
          const cityRaw = String(addr.city || addr.town || addr.county || addr.state_district || '');
          const areaRaw = String(addr.suburb || addr.neighbourhood || addr.residential || addr.village || addr.city_district || '');
          const cityNorm = cityRaw.toLowerCase();

          if (cityNorm.includes('jaipur')) {
            setEditFormCity('jaipur');
            const flatAreas: Array<[string, string]> = Object.values(JAIPUR_LOCATIONS)
              .flat()
              .map((a) => [a.toLowerCase(), a] as [string, string]);
            const needle = areaRaw.toLowerCase();
            const match = flatAreas.find(([lower]) => lower === needle)
              || (needle ? flatAreas.find(([lower]) => lower.includes(needle) || needle.includes(lower)) : undefined);
            if (match) {
              setEditFormArea(match[1]);
              triggerToast(`Location detected: ${match[1]}, Jaipur. Tap Save Changes to keep it.`);
            } else if (areaRaw) {
              setEditFormArea(areaRaw);
              triggerToast(`Detected area "${areaRaw}" — please verify it. Tap Save Changes to keep it.`);
            } else {
              triggerToast('Jaipur detected. Please pick your area from the list.');
            }
          } else if (cityNorm) {
            const mapped = cityNorm.includes('bengaluru') || cityNorm.includes('bangalore')
              ? 'bangalore'
              : cityNorm.includes('delhi')
                ? 'delhi'
                : cityNorm.includes('mumbai')
                  ? 'mumbai'
                  : null;
            if (mapped) {
              setEditFormCity(mapped);
              if (areaRaw) setEditFormArea(areaRaw);
              triggerToast(`Location detected: ${cityRaw}. Tap Save Changes to keep it.`);
            } else {
              triggerToast(`Detected city "${cityRaw}" is not in the supported list — selection unchanged.`);
            }
          } else {
            triggerToast('Could not resolve city from GPS. Please select manually.');
          }
        } catch {
          triggerToast('Location lookup failed. Please select manually.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (err) => {
        setIsDetectingLocation(false);
        triggerToast(
          err.code === 1
            ? 'Location permission denied — please select your area manually.'
            : 'Could not get GPS position — please select manually.'
        );
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  const [isCopiedLink, setIsCopiedLink] = useState(false);

  // Honest app-share link. Referral rewards & paid memberships are NOT launched
  // yet — no fake codes, discounts or tier claims anywhere (PDR honesty rule).
  const profileDeepLink = window.location.origin;

  const handleCopyProfileLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(profileDeepLink);
    }
    setIsCopiedLink(true);
    triggerToast('Copied!');
    setTimeout(() => {
      setIsCopiedLink(false);
    }, 2000);
  };

  const handleShareProfile = async () => {
    const shareData = {
      title: `${name}'s Nexora Beauty Passport`,
      text: `${name || 'I'} booked my salon appointment with Nexora — verified salons, secure 25% advance shown upfront. Try it:`,
      url: profileDeepLink,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        triggerToast('Profile & referral card shared successfully!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          navigator.clipboard?.writeText(`${shareData.text} ${shareData.url}`);
          triggerToast('Profile deep-link copied to clipboard!');
        }
      }
    } else {
      navigator.clipboard?.writeText(`${shareData.text} ${shareData.url}`);
      triggerToast('Profile deep-link & referral code copied to clipboard!');
    }
  };

  // Handler for sending mock support messages
  // Automated concierge replies — honest, policy-only, no human promises.
  const handleSendSupportMessage = (text: string) => {
    if (!text.trim()) return;
    setSupportMessages((prev) => [...prev, { sender: 'user', text }]);
    setSupportInput('');

    setTimeout(() => {
      let reply = 'Nexora Assistant (automated): I can answer questions about bookings, payments and settings. For anything else, create a support ticket from Help Home.';
      if (text.toLowerCase().includes('booking') || text.toLowerCase().includes('cancel')) {
        reply = 'Nexora Assistant (automated): manage bookings from the Bookings tab. Same-day customer cancellation and no-show are not refundable; a salon cancellation qualifies your advance for a full refund via the verified payment flow.';
      } else if (text.toLowerCase().includes('payment') || text.toLowerCase().includes('refund')) {
        reply = 'Nexora Assistant (automated): the 25% advance is calculated on the server and shown before you pay. Approved refunds stay pending until the payment provider confirms processing.';
      } else if (text.toLowerCase().includes('gold') || text.toLowerCase().includes('membership')) {
        reply = 'Nexora Assistant (automated): paid membership plans have not launched yet. Benefits, if any, will be listed in the app before you pay.';
      }
      setSupportMessages((prev) => [...prev, { sender: 'bot', text: reply }]);
    }, 800);
  };

  // Installer prompt handler mock
  const handleInstallApp = () => {
    setIsInstallModalOpen(true);
  };

  // Saved Address Helper Methods
  const handleAddNewAddressInit = () => {
    setFormLabel('Home');
    setFormFlat('');
    setFormStreet('');
    setFormLandmark('');
    setFormCity('Jaipur');
    setFormPincode('');
    setFormIsDefault(savedAddresses.length === 0);
    setSelectedAddressForEdit(null);
    setAddressView('add');
  };

  const handleEditAddressInit = (addr: Address) => {
    setFormLabel(addr.label);
    setFormFlat(addr.flatNumber);
    setFormStreet(addr.street);
    setFormLandmark(addr.landmark || '');
    setFormCity(addr.city);
    setFormPincode(addr.pincode);
    setFormIsDefault(addr.isDefault);
    setSelectedAddressForEdit(addr);
    setAddressView('edit');
  };

  const handleDeleteAddress = (addrId: string) => {
    if (!supabase || !customerId) return;
    deleteAddress(supabase, customerId, addrId)
      .then(setSavedAddresses)
      .then(() => triggerToast('Address deleted successfully!'))
      .catch((e) => {
        console.warn('Delete address notice:', e?.message || e);
        triggerToast('Could not delete the address right now.');
      });
  };

  const handleSetDefaultAddress = (addrId: string) => {
    if (!supabase || !customerId) return;
    setDefaultAddress(supabase, customerId, addrId)
      .then(setSavedAddresses)
      .then(() => triggerToast('Default address updated!'))
      .catch((e) => {
        console.warn('Default address notice:', e?.message || e);
        triggerToast('Could not update the default address right now.');
      });
  };

  const handleSaveAddressForm = () => {
    if (!formFlat.trim() || !formStreet.trim() || !formPincode.trim()) {
      triggerToast('Please fill in House/Flat No, Street, and PIN Code.');
      return;
    }
    if (!supabase || !customerId) {
      triggerToast('Saving addresses needs a signed-in account. Please log in again.');
      return;
    }

    const payload = {
      label: formLabel,
      flatNumber: formFlat,
      street: formStreet,
      landmark: formLandmark,
      city: formCity,
      pincode: formPincode,
      isDefault: formIsDefault,
    };
    const makeDefault = formIsDefault || savedAddresses.length === 0;
    const op = addressView === 'add'
      ? addAddress(supabase, customerId, payload, makeDefault)
      : selectedAddressForEdit
        ? updateAddress(supabase, customerId, selectedAddressForEdit.id, payload, makeDefault)
        : null;
    if (!op) return;
    op
      .then(setSavedAddresses)
      .then(() => {
        triggerToast(addressView === 'add' ? 'Address saved & synced!' : 'Address updated & synced!');
        setAddressView('list');
      })
      .catch((e: any) => {
        console.warn('Save address notice:', e?.message || e);
        triggerToast('Could not save the address right now — please try again.');
      });
  };

  // Real GPS detection for the address form — no hardcoded fills.
  const handleLocateMeInForm = () => {
    if (isLocating) return;
    if (!('geolocation' in navigator)) {
      triggerToast('Geolocation is not supported on this device.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } },
          );
          if (!resp.ok) throw new Error(`geocoder HTTP ${resp.status}`);
          const data = await resp.json();
          const addr = data?.address || {};
          const city = String(addr.city || addr.town || addr.county || addr.state_district || '');
          const streetParts = [addr.road, addr.suburb || addr.neighbourhood || addr.residential].filter(Boolean);
          if (addr.postcode) setFormPincode(String(addr.postcode));
          if (city) setFormCity(city);
          if (streetParts.length) setFormStreet(streetParts.join(', '));
          if (addr.amenity || addr.building) setFormFlat(String(addr.amenity || addr.building));
          triggerToast(city ? `GPS address detected in ${city} — please verify before saving.` : 'GPS position found — please verify the address before saving.');
        } catch {
          triggerToast('Location lookup failed. Please enter the address manually.');
        } finally {
          setIsLocating(false);
        }
      },
      (err) => {
        setIsLocating(false);
        triggerToast(err.code === 1 ? 'Location permission denied — please type the address.' : 'Could not get GPS position — please type the address.');
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  };

  // Quick stats calculations
  const upcomingCount = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING').length;

  // Nexora Points Calculation (10 points per 100 spent = 1 point per 10)
  const totalSpent = bookings
    .filter((b) => b.status === 'PAST' || b.status === 'COMPLETED')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);
  const nexoraPoints = Math.floor(totalSpent / 10);

  // Temporaries for form editing
  const [editFormName, setEditFormName] = useState(name);
  const [editFormEmail, setEditFormEmail] = useState(email);
  const [editFormPhone, setEditFormPhone] = useState(phone);
  const [editFormAvatar, setEditFormAvatar] = useState(avatar);
  const [editFormDob, setEditFormDob] = useState(dob);
  const [editFormGender, setEditFormGender] = useState(gender);
  const [editFormCity, setEditFormCity] = useState(preferredCity);
  const [editFormArea, setEditFormArea] = useState(preferredArea);

  // Synchronize when modal opens
  const openEditModal = () => {
    setEditFormName(name);
    setEditFormEmail(email);
    setEditFormPhone(phone);
    setEditFormAvatar(avatar);
    setEditFormDob(dob);
    setEditFormGender(gender);
    setEditFormCity(preferredCity);
    setEditFormArea(preferredArea);
    setNameError(null);
    setIsEditOpen(true);
  };

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Photo upload goes straight to Supabase Storage (avatars bucket) and the
  // shared profiles.photo_url — every device loads the same image (STEP 8).
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      triggerToast('Please choose an image file (JPG, PNG or WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      triggerToast('Image is too large. Please select an image under 2MB.');
      return;
    }
    if (!onUploadAvatar) {
      triggerToast('Photo upload is unavailable right now.');
      return;
    }
    setIsUploadingPhoto(true);
    const ok = await onUploadAvatar(file);
    setIsUploadingPhoto(false);
    if (ok) {
      setEditFormAvatar(avatarUrlWithVersion(profile ?? null));
      triggerToast('Photo uploaded & synced to all your devices!');
    } else {
      triggerToast('Photo upload failed — please try again.');
    }
  };

  // Keep the edit form's photo aligned with the shared profile row.
  useEffect(() => {
    if (isEditOpen) setEditFormAvatar(avatarUrlWithVersion(profile ?? null));
  }, [profile?.photo_url, profile?.updated_at]);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-5 pb-40 pt-2 animate-in fade-in relative">
      <input
        type="file"
        id="avatar-upload-file-input"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />
      {/* Toast Notification Container */}
      {toast ? (
        <div className="fixed bottom-32 mb-safe left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm bg-[#26181c] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between z-[300] transition-all duration-300 transform translate-y-0 opacity-100 border border-[#e6007e]/30">
          <span className="font-semibold text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#e6007e]">verified</span>
            {toast}
          </span>
          <button onClick={() => setToast(null)} className="text-[11px] text-[#ffb0c8] font-bold uppercase cursor-pointer">
            Dismiss
          </button>
        </div>
      ) : null}

      {/* Screen Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#e8e8e8]/80">
        <div className="flex items-center gap-1">
          <button
            onClick={() => onBack ? onBack() : onNavigate('home')}
            className="w-10 h-10 -ml-2 rounded-full hover:bg-[#fff0f2] flex items-center justify-center text-[#5a3f47] transition-all cursor-pointer"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-[24px] text-[#e6007e]">arrow_back</span>
          </button>
          <div>
            <h1 className="text-[24px] font-bold text-[#26181c] font-headline">Profile</h1>
            <p className="text-[12px] text-[#8c7077]">Manage your personal beauty passport</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('settings')}
          className="w-10 h-10 rounded-full hover:bg-[#fff0f2] flex items-center justify-center text-[#5a3f47] transition-all cursor-pointer"
          aria-label="Settings"
        >
          <span className="material-symbols-outlined text-[24px] text-[#e6007e]">settings</span>
        </button>
      </div>

      {/* Profile Summary Card */}
      <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#e8e8e8] flex flex-col gap-4 relative overflow-hidden">
        {/* Elegant top background ribbon/glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#ffd9e2]/30 to-transparent pointer-events-none" />

        <div className="flex items-start gap-4">
          <div className="relative">
            <img
              src={avatar}
              alt={name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#e6007e] shadow-xs"
            />
            <button
              onClick={openEditModal}
              className="absolute bottom-0 right-0 w-7 h-7 bg-[#e6007e] text-white rounded-full flex items-center justify-center shadow-md border-2 border-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"
              aria-label="Edit Profile"
              title="Edit Profile"
            >
              <span className="material-symbols-outlined text-[15px]">edit</span>
            </button>
          </div>

          <div className="flex-1 min-w-0 py-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-[18px] font-bold text-[#26181c] leading-tight truncate">{name}</h2>
            </div>
            <p className="text-[13px] text-[#5a3f47] font-medium mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#8c7077]">call</span>
              {phone}
            </p>
            <p className="text-[12px] text-[#8c7077] mt-0.5 flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-[14px] text-[#8c7077]">mail</span>
              {email}
            </p>
          </div>
        </div>

        {/* Edit Action Button and Benefits Row */}
        <div className="grid grid-cols-2 gap-3 pt-3.5 border-t border-[#e8e8e8]/60">
          <button
            onClick={() => setIsMembershipOpen(true)}
            className="bg-[#fff8f8] hover:bg-[#ffe8ed]/60 p-3 rounded-2xl border border-[#ffe8ed] text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#8e004b] mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Membership</span>
              </div>
              <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
            </div>
            <p className="text-[13px] font-bold text-[#26181c]">Membership Plans</p>
          </button>

          <button
            onClick={() => onNavigate('rewards')}
            className="bg-[#fcf9f8] hover:bg-[#fde7f3]/40 p-3 rounded-2xl border border-[#e8e8e8] text-left transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between text-[#e6007e] mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">stars</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Nexora Points</span>
              </div>
              <span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span>
            </div>
            <p className="text-[13px] font-bold text-[#26181c]">{nexoraPoints.toLocaleString()} pts</p>
          </button>
        </div>

        {/* Share Profile Banner Button */}
        <button
          onClick={() => setIsShareModalOpen(true)}
          className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#fde7f3] via-[#fff0f2] to-[#fde7f3] hover:from-[#e6007e] hover:to-[#b90064] text-[#e6007e] hover:text-white border border-[#fcd5e8] font-bold text-xs flex items-center justify-between transition-all shadow-2xs active:scale-[0.99] cursor-pointer group animate-pulse hover:animate-none ring-2 ring-[#e6007e]/25"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] group-hover:rotate-12 transition-transform">ios_share</span>
            <span>Share Nexora with Friends</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 group-hover:bg-white/20 text-[#26181c] group-hover:text-white border border-[#fcd5e8]/50 group-hover:border-white/30">
            Share
          </span>
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <button
          onClick={() => onNavigate('bookings')}
          className="bg-white p-3.5 rounded-2xl border border-[#e8e8e8] hover:bg-[#fff0f2] active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-xs cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-[#fde7f3] flex items-center justify-center text-[#e6007e]">
            <span className="material-symbols-outlined text-[18px]">calendar_today</span>
          </div>
          <span className="text-[16px] font-extrabold text-[#26181c] mt-1">
            {upcomingCount}
          </span>
          <span className="text-[10px] text-[#5a3f47] font-semibold">Upcoming</span>
        </button>

        <button
          onClick={() => onNavigate('favourites')}
          className="bg-white p-3.5 rounded-2xl border border-[#e8e8e8] hover:bg-[#fff0f2] active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-xs cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-[#fde7f3] flex items-center justify-center text-[#e6007e]">
            <span className="material-symbols-outlined text-[18px]">favorite</span>
          </div>
          <span className="text-[16px] font-extrabold text-[#26181c] mt-1">{favoritesCount}</span>
          <span className="text-[10px] text-[#5a3f47] font-semibold">Saved</span>
        </button>

        <button
          onClick={() => onNavigate('rewards')}
          className="bg-white p-3.5 rounded-2xl border border-[#e8e8e8] hover:bg-[#fff0f2] active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-xs cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-[#fde7f3] flex items-center justify-center text-[#e6007e]">
            <span className="material-symbols-outlined text-[18px]">card_giftcard</span>
          </div>
          <span className="text-[16px] font-extrabold text-[#26181c] mt-1">1,200</span>
          <span className="text-[10px] text-[#5a3f47] font-semibold">Points</span>
        </button>
      </div>

      {/* Menu Options Groups */}
      <div className="flex flex-col gap-5">
        
        {/* Group 1: Bookings & Benefits */}
        <div className="flex flex-col">
          <h3 className="text-[12px] font-extrabold text-[#8c7077] uppercase tracking-wider mb-2 px-1">
            Bookings & Benefits
          </h3>
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-xs">
            <MenuItem
              icon="receipt_long"
              label="My Bookings"
              badge={upcomingCount > 0 ? upcomingCount : undefined}
              onClick={() => onNavigate('bookings')}
            />
            <MenuItem
              icon="favorite"
              label="Favourites"
              badge={favoritesCount > 0 ? favoritesCount : undefined}
              onClick={() => onNavigate('favourites')}
            />
            <MenuItem
              icon="card_giftcard"
              label="Rewards"
              onClick={() => onNavigate('rewards')}
            />
            <MenuItem
              icon="share_reviews"
              label="Refer & Earn"
              onClick={() => setIsReferEarnOpen(true)}
            />
            <MenuItem
              icon="ios_share"
              label="Share Profile Card"
              badge="Deep Link"
              onClick={() => setIsShareModalOpen(true)}
            />
            <MenuItem
              icon="card_membership"
              label="Membership"
              onClick={() => setIsMembershipOpen(true)}
            />
          </div>
        </div>

        {/* Group 2: Account */}
        <div className="flex flex-col">
          <h3 className="text-[12px] font-extrabold text-[#8c7077] uppercase tracking-wider mb-2 px-1">
            Account
          </h3>
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-xs">
            <MenuItem
              icon="person"
              label="Personal Information"
              onClick={openEditModal}
            />
            <MenuItem
              icon="credit_card"
              label="Saved Cards & Payment Methods"
              badge={`${savedCards.length} Saved`}
              onClick={() => setIsPaymentMethodsOpen(true)}
            />
            <MenuItem
              icon="location_on"
              label="Saved Addresses"
              badge={savedAddresses.find(a => a.isDefault)?.label || 'Manage'}
              onClick={() => {
                onNavigate('saved-addresses');
              }}
            />
            <MenuItem
              icon="notifications"
              label="Notifications"
              onClick={() => onNavigate('settings')}
            />
          </div>
        </div>

        {/* Group 3: Help */}
        <div className="flex flex-col">
          <h3 className="text-[12px] font-extrabold text-[#8c7077] uppercase tracking-wider mb-2 px-1">
            Help
          </h3>
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-xs">
            <MenuItem
              icon="support_agent"
              label="Contact Support"
              badge="Online"
              onClick={() => onNavigate('support')}
            />
            <MenuItem
              icon="help_center"
              label="Frequently Asked Questions"
              onClick={() => onNavigate('support')}
            />
            <MenuItem
              icon="policy"
              label="Privacy Policy"
              onClick={() => setIsPolicyOpen(true)}
            />
            <MenuItem
              icon="gavel"
              label="Terms & Conditions"
              onClick={() => setIsTermsOpen(true)}
            />
          </div>
        </div>

        {/* Group 4: App */}
        <div className="flex flex-col">
          <h3 className="text-[12px] font-extrabold text-[#8c7077] uppercase tracking-wider mb-2 px-1">
            App
          </h3>
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-xs">
            <MenuItem
              icon="language"
              label="Language"
              badge={selectedLanguage}
              onClick={() => setIsLanguageOpen(true)}
            />
            <MenuItem
              icon="tune"
              label="App Settings"
              onClick={() => onNavigate('settings')}
            />
            <MenuItem
              icon="download"
              label="Install App"
              badge="PWA"
              onClick={handleInstallApp}
            />
            <MenuItem
              icon="info"
              label="About Nexora"
              onClick={() => setIsAboutOpen(true)}
            />
            <MenuItem
              icon="reviews"
              label="App Feedback"
              onClick={() => setIsFeedbackOpen(true)}
            />
          </div>
        </div>

        {/* Logout Section */}
        <div className="mt-2">
          <button
            onClick={() => onNavigate('welcome')}
            className="w-full flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100/70 active:scale-[0.98] rounded-2xl text-red-600 transition-all text-left shadow-xs border border-red-100/50 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px] font-bold">logout</span>
            <span className="text-[14px] font-extrabold">Log Out</span>
          </button>
        </div>

      </div>

      {/* Footer Branding & Legal */}
      <div className="flex flex-col items-center justify-center pt-6 pb-2 border-t border-[#e8e8e8]/50 text-center gap-1">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#e6007e]">Nexora PWA</span>
        <span className="text-[11px] text-[#8c7077]">Web app — updates apply automatically</span>
        <span className="text-[10px] text-[#8c7077]/80 mt-1">© 2026 Nexora. All rights reserved.</span>
      </div>

      {/* -------------------- ALL INTERACTIVE MODALS -------------------- */}

      {/* Modal 1: Edit Profile (Personal Information) */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Personal Information">
        <div className="flex flex-col gap-4">
          
          {/* Profile Photo Section */}
          <div className="flex flex-col items-center justify-center py-4 bg-[#fcf9f8] rounded-2xl border border-[#e8e8e8] relative overflow-hidden">
            <div className="relative group">
              {editFormAvatar ? (
                <img
                  alt="Profile Photo"
                  className="w-24 h-24 rounded-full object-cover shadow-[0_8px_32px_rgba(185,0,100,0.15)] ring-4 ring-white"
                  src={editFormAvatar}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-[#fde7f3] flex items-center justify-center ring-4 ring-white shadow-[0_8px_32px_rgba(185,0,100,0.15)]">
                  <span className="material-symbols-outlined text-[40px] text-[#e6007e]">person</span>
                </div>
              )}
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 bg-[#b90064] text-white rounded-full flex items-center justify-center shadow-md transform hover:scale-105 transition-transform cursor-pointer"
                onClick={() => {
                  document.getElementById('avatar-upload-file-input')?.click();
                }}
              >
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
              </button>
            </div>

            <div className="flex flex-col items-center gap-1.5 mt-3 w-full px-4">
              <div className="flex gap-3 mt-1.5">
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => {
                    document.getElementById('avatar-upload-file-input')?.click();
                  }}
                  className="text-[11px] text-white font-semibold px-4 py-1.5 bg-[#b90064] hover:bg-[#8e004b] rounded-full transition-colors flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[13px]">{isUploadingPhoto ? 'progress_activity' : 'upload'}</span>
                  {isUploadingPhoto ? 'Uploading…' : 'Upload Photo'}
                </button>
                {editFormAvatar ? (
                  <button
                    type="button"
                    onClick={() => setEditFormAvatar('')}
                    className="text-[11px] text-[#594047] font-semibold px-3 py-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <span className="text-[10px] text-[#8c7077] mt-1 text-center">Stored securely in your Nexora account — visible on every device.</span>
            </div>
          </div>

          {/* Form Fields Container */}
          <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">

            {/* Basic Info Card */}
            <div className="bg-[#fff8f8] rounded-2xl p-4 border border-[#e0bec6]/40 flex flex-col gap-4 relative overflow-hidden w-full">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-[#ffd9e2] to-transparent opacity-20 rounded-full blur-2xl pointer-events-none"></div>

          {/* Full Name */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-[12px] font-bold text-[#594047] ml-1 block w-full" htmlFor="fullName">Full Name</label>
                <div className="relative flex items-center w-full">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c7077] text-[20px] pointer-events-none z-10">person</span>
                  <input
                    id="fullName"
                    type="text"
                    value={editFormName}
                    onChange={(e) => {
                      setEditFormName(e.target.value);
                      if (e.target.value.trim().length >= 2) {
                        setNameError(null);
                      }
                    }}
                    className={`w-full h-12 bg-white text-[14px] font-medium text-[#26181c] rounded-xl pl-11 pr-4 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all box-border ${
                      nameError ? 'border-red-500 ring-2 ring-red-100' : 'border-[#e8e8e8]'
                    }`}
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>
                {nameError && (
                  <span className="text-[11px] text-red-500 font-bold ml-1 mt-0.5 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[13px]">error</span>
                    {nameError}
                  </span>
                )}
              </div>

              {/* Mobile Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#594047] ml-1" htmlFor="mobile">Mobile Number</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c7077] text-[20px] pointer-events-none">phone_iphone</span>
                  <div className="absolute left-11 top-1/2 -translate-y-1/2 flex items-center text-[14px] text-[#26181c] pointer-events-none">
                    <span>+91</span>
                    <div className="w-px h-5 bg-[#e8e8e8] mx-2"></div>
                  </div>
                  <input
                    id="mobile"
                    type="tel"
                    value={editFormPhone.replace('+91 ', '')}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setEditFormPhone(val ? `+91 ${val}` : '');
                    }}
                    className="w-full h-12 bg-white text-[14px] text-[#26181c] rounded-xl pl-24 pr-4 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all"
                    placeholder="98765 43210"
                  />
                </div>
              </div>

              {/* Email Address (Read-only) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[12px] font-bold text-[#594047]" htmlFor="email">Email Address</label>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] rounded-full text-[10px] font-extrabold tracking-wide uppercase shadow-xs">
                    <span className="material-symbols-outlined text-[11px] font-bold">check_circle</span>
                    Verified
                  </div>
                </div>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c7077] text-[20px] pointer-events-none">mail</span>
                  <input
                    id="email"
                    type="email"
                    value={editFormEmail}
                    readOnly
                    className="w-full h-12 bg-[#ffe8ed]/30 text-[14px] text-[#594047] rounded-xl pl-11 pr-11 border border-[#e8e8e8] opacity-70 cursor-not-allowed"
                  />
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[#8c7077] text-[18px] pointer-events-none">lock</span>
                </div>
                <p className="text-[11px] text-[#8c7077]/80 ml-1 leading-normal">
                  Email cannot be changed directly for security purposes.{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsSupportOpen(true);
                      setIsEditOpen(false);
                      handleSendSupportMessage('Hi, I would like to request an email update for my profile.');
                    }}
                    className="text-[#b90064] font-bold hover:underline cursor-pointer"
                  >
                    Contact support to update.
                  </button>
                </p>
              </div>
            </div>

            {/* Personal Details Card */}
            <div className="bg-white rounded-2xl p-4 border border-[#e8e8e8] flex flex-col gap-4 shadow-xs">
              {/* Date of Birth */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#594047] ml-1" htmlFor="dob">Date of Birth</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c7077] text-[20px] pointer-events-none">calendar_month</span>
                  <input
                    id="dob"
                    type="date"
                    value={editFormDob}
                    onChange={(e) => setEditFormDob(e.target.value)}
                    className="w-full h-12 bg-[#fcf9f8] text-[14px] text-[#26181c] rounded-xl pl-11 pr-4 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all"
                  />
                </div>
              </div>

              {/* Gender Preference */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#594047] ml-1">Gender Preference (For Services)</label>
                <div className="flex gap-2">
                  {['female', 'male', 'any'].map((g) => (
                    <label key={g} className="flex-1 relative cursor-pointer">
                      <input
                        type="radio"
                        name="gender"
                        value={g}
                        checked={editFormGender === g}
                        onChange={() => setEditFormGender(g)}
                        className="peer sr-only"
                      />
                      <div className="h-11 flex items-center justify-center bg-[#fcf9f8] text-[13px] text-[#26181c] font-bold rounded-xl border border-[#e8e8e8] peer-checked:bg-[#ffd9e2] peer-checked:text-[#8e004b] peer-checked:border-[#e6007e] peer-checked:ring-1 peer-checked:ring-[#e6007e] transition-all">
                        {g === 'female' ? 'Female' : g === 'male' ? 'Male' : 'No Pref'}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Location Preferences Card */}
            <div className="bg-white rounded-2xl p-4 border border-[#e8e8e8] flex flex-col gap-4 shadow-xs">
              {/* Preferred City */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#594047] ml-1" htmlFor="city">Preferred City</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-[#8c7077] text-[20px]">location_city</span>
                  <select
                    id="city"
                    value={editFormCity}
                    onChange={(e) => setEditFormCity(e.target.value)}
                    className="w-full h-12 bg-[#fcf9f8] text-[14px] text-[#26181c] rounded-xl pl-11 pr-10 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all appearance-none font-medium"
                  >
                    <option value="jaipur">Jaipur</option>
                    <option value="mumbai">Mumbai</option>
                    <option value="delhi">Delhi NCR</option>
                    <option value="bangalore">Bangalore</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 text-[#8c7077] pointer-events-none text-[20px]">expand_more</span>
                </div>
              </div>

              {/* Preferred Area */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#594047] ml-1" htmlFor="area">Preferred Area</label>
                <div className="relative flex items-center">
                  <span className="material-symbols-outlined absolute left-4 text-[#8c7077] text-[20px]">pin_drop</span>
                  <input
                    id="area"
                    type="text"
                    value={editFormArea}
                    onChange={(e) => setEditFormArea(e.target.value)}
                    className="w-full h-12 bg-[#fcf9f8] text-[14px] text-[#26181c] rounded-xl pl-11 pr-12 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all"
                    placeholder="e.g. Jhotwara"
                  />
                  <button
                    type="button"
                    onClick={handleDetectLocation}
                    disabled={isDetectingLocation}
                    className="absolute right-3 w-8 h-8 text-[#b90064] hover:bg-[#ffe8ed] rounded-full transition-colors flex items-center justify-center cursor-pointer disabled:opacity-60"
                    title="Detect Current Location (GPS)"
                    aria-label="Detect current location"
                  >
                    <span className={`material-symbols-outlined text-[18px] ${isDetectingLocation ? 'animate-spin' : ''}`}>
                      {isDetectingLocation ? 'progress_activity' : 'my_location'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-[#e8e8e8] flex gap-2">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="flex-1 h-12 bg-[#fff8f8] border border-[#e0bec6] text-[#b90064] font-bold rounded-xl transition-all cursor-pointer hover:bg-[#ffe8ed]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSavingProfile}
              onClick={() =>
                handleSaveProfile(
                  editFormName,
                  editFormEmail,
                  editFormPhone,
                  editFormAvatar,
                  editFormDob,
                  editFormGender,
                  editFormCity,
                  editFormArea
                )
              }
              className="flex-1 h-12 bg-[#b90064] text-white font-bold rounded-xl transition-all shadow-md hover:bg-[#8e004b] cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSavingProfile && (
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              )}
              {isSavingProfile ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

        </div>
      </Modal>
      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="App Feedback">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#5a3f47]">We'd love to hear your thoughts on Nexora. Your feedback helps us improve.</p>
          <div className="flex justify-center gap-2 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(star)}
                className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[32px] ${feedbackRating >= star ? 'text-[#e6007e] fill-current' : 'text-[#e0bec6]'}`}>
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you love or what could be better..."
            className="w-full h-32 p-3 bg-[#fff8f8] border border-[#e0bec6] rounded-xl text-[14px] text-[#26181c] placeholder:text-[#8c7077] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] resize-none transition-all"
          />
          <button
            onClick={handleSubmitFeedback}
            className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md transition-all hover:bg-[#8e004b] active:scale-95 mt-2 cursor-pointer"
          >
            Submit Feedback
          </button>
        </div>
      </Modal>

      {/* Modal 2: Refer & Earn — program NOT launched; fully honest content */}
      <Modal isOpen={isReferEarnOpen} onClose={() => setIsReferEarnOpen(false)} title="Refer & Earn">
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#fde7f3] flex items-center justify-center text-[#e6007e]">
            <span className="material-symbols-outlined text-[32px]">redeem</span>
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-[#26181c]">Referral rewards are coming soon</h4>
            <p className="text-xs text-[#5a3f47] mt-1 px-4 leading-relaxed">
              Nexora ka referral program abhi launch nahi hua hai. Jab live hoga, exact reward
              aur rules yahin dikhenge — bina kisi hidden condition ke. Tab tak aap app link
              share kar sakte hain:
            </p>
          </div>

          <div className="w-full bg-[#fff8f8] border border-dashed border-[#fcd5e8] p-4 rounded-xl flex items-center justify-between gap-3 mt-1">
            <div className="text-left min-w-0 flex-1">
              <span className="text-[10px] uppercase font-bold text-[#8c7077]">App Link</span>
              <p className="text-[13px] font-bold text-[#e6007e] truncate">{profileDeepLink}</p>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(profileDeepLink);
                triggerToast('App link copied to clipboard!');
              }}
              className="px-4 py-2 bg-[#e6007e] text-white text-xs font-bold rounded-lg hover:bg-[#b90064] active:scale-95 transition-all shrink-0"
            >
              Copy Link
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Share Profile Card */}
      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Profile Card">
        <div className="flex flex-col gap-4 items-center text-center">
          {/* Card Visual Preview */}
          <div className="w-full bg-gradient-to-br from-[#26181c] via-[#3a2028] to-[#1a0e12] p-5 rounded-2xl text-white shadow-xl relative overflow-hidden border border-[#e6007e]/30">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#e6007e]/30 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 bg-[#e6007e]/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-[#e6007e]">auto_awesome</span>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#ffb0c8]">Nexora Beauty Passport</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#e6007e]/20 text-[#ffb0c8] text-[10px] font-extrabold border border-[#e6007e]/40">
                Nexora Customer
              </span>
            </div>

            <div className="flex items-center gap-3.5 text-left mb-4">
              <img
                src={avatar}
                alt={name}
                className="w-14 h-14 rounded-full object-cover border-2 border-[#e6007e] shadow-md"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-[16px] font-extrabold text-white truncate">{name}</h4>
                <p className="text-[11px] text-[#ffb0c8] flex items-center gap-1 mt-0.5">
                  <span className="material-symbols-outlined text-[13px]">location_on</span>
                  {preferredArea}, {preferredCity.toUpperCase()}
                </p>
                <p className="text-[10px] text-white/70 mt-0.5">
                  {bookings.length} booking{bookings.length === 1 ? '' : 's'} on Nexora
                </p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center justify-between gap-2">
              <div className="text-left">
                <span className="text-[9px] uppercase font-extrabold text-[#ffb0c8] tracking-wider block">Book with confidence</span>
                <span className="text-[13px] font-bold text-white">Verified salons · secure 25% advance</span>
              </div>
              <span className="material-symbols-outlined text-[24px] text-[#e6007e]">verified</span>
            </div>
          </div>

          <p className="text-xs text-[#5a3f47] leading-relaxed px-2">
            Share your Nexora Beauty Passport — live salons, real bookings, backed by your Nexora account on every device.
          </p>

          {/* Deep Link Input Field */}
          <div
            onClick={handleCopyProfileLink}
            className="w-full flex items-center bg-[#fcf9f8] hover:bg-[#fde7f3]/50 border border-[#e8e8e8] hover:border-[#fcd5e8] rounded-xl p-1.5 gap-2 cursor-pointer transition-all group"
            title="Click to copy profile URL"
          >
            <span className="material-symbols-outlined text-[18px] text-[#8c7077] group-hover:text-[#e6007e] ml-2 transition-colors">link</span>
            <input
              type="text"
              readOnly
              value={profileDeepLink}
              onClick={(e) => {
                e.stopPropagation();
                handleCopyProfileLink();
              }}
              className="flex-1 text-[11px] font-mono text-[#26181c] bg-transparent focus:outline-none truncate cursor-pointer"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCopyProfileLink();
              }}
              className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                isCopiedLink
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-[#fde7f3] text-[#e6007e] hover:bg-[#e6007e] hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {isCopiedLink ? 'check' : 'content_copy'}
              </span>
              <span>{isCopiedLink ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Share Action Buttons */}
          <div className="w-full grid grid-cols-2 gap-2 mt-1">
            <button
              onClick={handleShareProfile}
              className="py-3 px-4 bg-[#e6007e] hover:bg-[#b90064] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              Native Share
            </button>

            <button
              onClick={() => {
                const text = encodeURIComponent(`Check out Nexora — verified salons with secure advance booking: ${profileDeepLink}`);
                window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
              }}
              className="py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              WhatsApp
            </button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="App Feedback">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#5a3f47]">We'd love to hear your thoughts on Nexora. Your feedback helps us improve.</p>
          <div className="flex justify-center gap-2 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(star)}
                className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[32px] ${feedbackRating >= star ? 'text-[#e6007e] fill-current' : 'text-[#e0bec6]'}`}>
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you love or what could be better..."
            className="w-full h-32 p-3 bg-[#fff8f8] border border-[#e0bec6] rounded-xl text-[14px] text-[#26181c] placeholder:text-[#8c7077] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] resize-none transition-all"
          />
          <button
            onClick={handleSubmitFeedback}
            className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md transition-all hover:bg-[#8e004b] active:scale-95 mt-2 cursor-pointer"
          >
            Submit Feedback
          </button>
        </div>
      </Modal>

      {/* Modal 3: Membership — plans NOT launched; fully honest content */}
      <Modal isOpen={isMembershipOpen} onClose={() => setIsMembershipOpen(false)} title="Nexora Membership">
        <div className="flex flex-col items-center text-center gap-4 p-2">
          <div className="w-16 h-16 rounded-full bg-[#fde7f3] flex items-center justify-center text-[#e6007e]">
            <span className="material-symbols-outlined text-[32px]">workspace_premium</span>
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-[#26181c]">Membership plans are coming soon</h4>
            <p className="text-xs text-[#5a3f47] mt-2 leading-relaxed">
              Nexora abhi koi paid membership offer nahi karta. Jab plans launch honge,
              unke exact benefits aur price yahin list honge — aap tabhi pay karenge jab
              aapko plan pasand ho. Aapke bookings aur points already aapke account me
              real-time track hote hain.
            </p>
          </div>
          <button
            onClick={() => setIsMembershipOpen(false)}
            className="w-full h-11 bg-[#b90064] text-white font-bold rounded-xl hover:bg-[#8e004b] transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </Modal>
      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="App Feedback">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#5a3f47]">We'd love to hear your thoughts on Nexora. Your feedback helps us improve.</p>
          <div className="flex justify-center gap-2 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(star)}
                className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[32px] ${feedbackRating >= star ? 'text-[#e6007e] fill-current' : 'text-[#e0bec6]'}`}>
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you love or what could be better..."
            className="w-full h-32 p-3 bg-[#fff8f8] border border-[#e0bec6] rounded-xl text-[14px] text-[#26181c] placeholder:text-[#8c7077] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] resize-none transition-all"
          />
          <button
            onClick={handleSubmitFeedback}
            className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md transition-all hover:bg-[#8e004b] active:scale-95 mt-2 cursor-pointer"
          >
            Submit Feedback
          </button>
        </div>
      </Modal>

      {/* Modal 4: Support & Live Chat */}
      <Modal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} title="Nexora Assistant (Automated)">
        <div className="flex flex-col h-[400px]">
          {/* Chat Bubble Area */}
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
            {supportMessages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[80%] rounded-2xl p-3 text-xs leading-normal ${
                  m.sender === 'bot'
                    ? 'self-start bg-[#fff8f8] text-[#26181c] border border-[#fcd5e8]'
                    : 'self-end bg-[#e6007e] text-white'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>

          {/* Quick Option Pills */}
          <div className="flex gap-1.5 overflow-x-auto py-2 border-t border-slate-100 whitespace-nowrap hide-scrollbar">
            {[
              'I need to cancel booking',
              'Payment failed but amount deducted',
              'Upgrade to Platinum membership',
              'Salon did not provide discount',
            ].map((q, i) => (
              <button
                key={i}
                onClick={() => handleSendSupportMessage(q)}
                className="px-3 py-1 bg-slate-100 text-[#5a3f47] text-[10px] font-bold rounded-full hover:bg-[#fff0f2] hover:text-[#e6007e] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat input box */}
          <div className="flex gap-2 items-center pt-2 border-t border-slate-100">
            <input
              type="text"
              value={supportInput}
              onChange={(e) => setSupportInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendSupportMessage(supportInput)}
              placeholder="Ask anything..."
              className="flex-1 h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#e6007e] text-xs"
            />
            <button
              onClick={() => handleSendSupportMessage(supportInput)}
              className="w-10 h-10 bg-[#e6007e] text-white rounded-xl flex items-center justify-center hover:bg-[#b90064] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
            </button>
          </div>
        </div>
      </Modal>
      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="App Feedback">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#5a3f47]">We'd love to hear your thoughts on Nexora. Your feedback helps us improve.</p>
          <div className="flex justify-center gap-2 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(star)}
                className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[32px] ${feedbackRating >= star ? 'text-[#e6007e] fill-current' : 'text-[#e0bec6]'}`}>
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you love or what could be better..."
            className="w-full h-32 p-3 bg-[#fff8f8] border border-[#e0bec6] rounded-xl text-[14px] text-[#26181c] placeholder:text-[#8c7077] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] resize-none transition-all"
          />
          <button
            onClick={handleSubmitFeedback}
            className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md transition-all hover:bg-[#8e004b] active:scale-95 mt-2 cursor-pointer"
          >
            Submit Feedback
          </button>
        </div>
      </Modal>

      {/* Modal 5: FAQs */}
      <Modal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} title="Frequently Asked Questions">
        <div className="flex flex-col gap-3.5">
          {[
            { q: 'How do I cancel my booking?', a: 'Manage bookings from the Bookings tab. Same-day customer cancellation and no-show are not refundable; a salon cancellation qualifies your advance for a full refund via the verified payment flow.' },
            { q: 'How do I pay for a booking?', a: 'The checkout shows the exact total and the 25% advance collected online via Razorpay (UPI/cards supported). The advance is always calculated on the server before you pay.' },
            { q: 'When will my refund process?', a: 'Approved refunds are recorded against your original payment and stay pending until the payment provider confirms processing.' },
            { q: 'How do I earn Nexora rewards?', a: 'The points ledger has not launched yet. Your Rewards tab already shows live counts from your real booking history — points activate with the rewards launch.' },
            { q: 'Where is my profile data stored?', a: 'In your Nexora account (Supabase). Profile, photo, favourites, addresses and settings sync automatically across every device where you log in.' },
          ].map((faq, i) => (
            <details key={i} className="group p-3 rounded-xl border border-slate-100 bg-slate-50 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex items-center justify-between cursor-pointer focus:outline-none select-none">
                <span className="text-[13px] font-bold text-[#26181c]">{faq.q}</span>
                <span className="material-symbols-outlined text-[18px] text-[#e6007e] transition-transform duration-200 group-open:rotate-180">
                  expand_more
                </span>
              </summary>
              <p className="text-xs text-[#5a3f47] mt-2 leading-relaxed border-t border-slate-200/50 pt-2">{faq.a}</p>
            </details>
          ))}
        </div>
      </Modal>
      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="App Feedback">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#5a3f47]">We'd love to hear your thoughts on Nexora. Your feedback helps us improve.</p>
          <div className="flex justify-center gap-2 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(star)}
                className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[32px] ${feedbackRating >= star ? 'text-[#e6007e] fill-current' : 'text-[#e0bec6]'}`}>
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you love or what could be better..."
            className="w-full h-32 p-3 bg-[#fff8f8] border border-[#e0bec6] rounded-xl text-[14px] text-[#26181c] placeholder:text-[#8c7077] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] resize-none transition-all"
          />
          <button
            onClick={handleSubmitFeedback}
            className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md transition-all hover:bg-[#8e004b] active:scale-95 mt-2 cursor-pointer"
          >
            Submit Feedback
          </button>
        </div>
      </Modal>

      {/* Modal 6: Privacy Policy */}
      <Modal isOpen={isPolicyOpen} onClose={() => setIsPolicyOpen(false)} title="Privacy Policy">
        <div className="text-xs text-[#5a3f47] flex flex-col gap-3.5 leading-relaxed">
          <p className="font-bold text-[#26181c]">Last updated: July 2026</p>
          <p>
            At Nexora, we take your personal privacy seriously. We collect profile details (name, email, phone) to personalize your stylist appointments and store location data strictly to locate top-tier salons within your immediate walking or driving distance.
          </p>
          <h5 className="font-bold text-[#26181c] uppercase tracking-wider text-[10px] mt-1">1. Data Security</h5>
          <p>
            Your information is encrypted end-to-end. We do not sell or lease any user data or styling histories to marketing agencies.
          </p>
          <h5 className="font-bold text-[#26181c] uppercase tracking-wider text-[10px] mt-1">2. PWA Cookies</h5>
          <p>
            We utilize persistent secure local cookies and LocalStorage protocols strictly to save your active favorites, verified booking status, and ambiance music selection.
          </p>
        </div>
      </Modal>
      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="App Feedback">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#5a3f47]">We'd love to hear your thoughts on Nexora. Your feedback helps us improve.</p>
          <div className="flex justify-center gap-2 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(star)}
                className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[32px] ${feedbackRating >= star ? 'text-[#e6007e] fill-current' : 'text-[#e0bec6]'}`}>
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you love or what could be better..."
            className="w-full h-32 p-3 bg-[#fff8f8] border border-[#e0bec6] rounded-xl text-[14px] text-[#26181c] placeholder:text-[#8c7077] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] resize-none transition-all"
          />
          <button
            onClick={handleSubmitFeedback}
            className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md transition-all hover:bg-[#8e004b] active:scale-95 mt-2 cursor-pointer"
          >
            Submit Feedback
          </button>
        </div>
      </Modal>

      {/* Modal 7: Terms & Conditions */}
      <Modal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} title="Terms & Conditions">
        <div className="text-xs text-[#5a3f47] flex flex-col gap-3.5 leading-relaxed">
          <p className="font-bold text-[#26181c]">Last updated: July 2026</p>
          <p>
            By booking a styling treatment through the Nexora application, you explicitly consent to our general booking agreements and policies.
          </p>
          <h5 className="font-bold text-[#26181c] uppercase tracking-wider text-[10px] mt-1">1. No-Show Policy</h5>
          <p>
            Stylists reserve slots specifically for you. Repeated failures to attend scheduled bookings without prior cancellation notice may restrict your Gold membership perks.
          </p>
          <h5 className="font-bold text-[#26181c] uppercase tracking-wider text-[10px] mt-1">2. Price Matching Guarantee</h5>
          <p>
            We guarantee salon menu price matching. If you are charged higher than our advertised pricing for the exact same salon treatment, Nexora will refund the difference instantly to your Rewards wallet.
          </p>
        </div>
      </Modal>
      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="App Feedback">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#5a3f47]">We'd love to hear your thoughts on Nexora. Your feedback helps us improve.</p>
          <div className="flex justify-center gap-2 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(star)}
                className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[32px] ${feedbackRating >= star ? 'text-[#e6007e] fill-current' : 'text-[#e0bec6]'}`}>
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you love or what could be better..."
            className="w-full h-32 p-3 bg-[#fff8f8] border border-[#e0bec6] rounded-xl text-[14px] text-[#26181c] placeholder:text-[#8c7077] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] resize-none transition-all"
          />
          <button
            onClick={handleSubmitFeedback}
            className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md transition-all hover:bg-[#8e004b] active:scale-95 mt-2 cursor-pointer"
          >
            Submit Feedback
          </button>
        </div>
      </Modal>

      {/* Modal 8: About App */}
      <Modal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} title="About Nexora">
        <div className="flex flex-col items-center text-center gap-4">
          <img
            alt="Nexora Brand Logo"
            className="h-14 w-auto object-contain"
            src="/icons/icon-192.png"
          />
          <div>
            <h4 className="text-[16px] font-bold text-[#26181c]">Nexora Client PWA</h4>
            <p className="text-[11px] text-[#8c7077] mt-0.5">Premium Beauty & Grooming Scheduler</p>
          </div>

          <p className="text-xs text-[#5a3f47] px-2 leading-relaxed">
            Nexora connects you with local beauty salons, expert barbers, and styling studios in Jaipur. Save favorites, manage bookings, and keep your profile synced securely across every device you sign in on.
          </p>

          <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 text-[11px] text-[#5a3f47] text-left flex flex-col gap-1 mt-2">
            <p><strong>Release:</strong> July 2026 (unified account sync build)</p>
            <p><strong>PWA Engine:</strong> Enabled (Offline-First Ready)</p>
            <p><strong>Environment:</strong> Production (Vercel)</p>
            <p><strong>Client:</strong> {email}</p>
          </div>
        </div>
      </Modal>
      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="App Feedback">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#5a3f47]">We'd love to hear your thoughts on Nexora. Your feedback helps us improve.</p>
          <div className="flex justify-center gap-2 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(star)}
                className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[32px] ${feedbackRating >= star ? 'text-[#e6007e] fill-current' : 'text-[#e0bec6]'}`}>
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you love or what could be better..."
            className="w-full h-32 p-3 bg-[#fff8f8] border border-[#e0bec6] rounded-xl text-[14px] text-[#26181c] placeholder:text-[#8c7077] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] resize-none transition-all"
          />
          <button
            onClick={handleSubmitFeedback}
            className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md transition-all hover:bg-[#8e004b] active:scale-95 mt-2 cursor-pointer"
          >
            Submit Feedback
          </button>
        </div>
      </Modal>

      {/* Modal 9: Language */}
      <Modal isOpen={isLanguageOpen} onClose={() => setIsLanguageOpen(false)} title="Select Language">
        <div className="flex flex-col gap-2">
          {[
            { code: 'en', name: 'English', localName: 'English (US)' },
            { code: 'hi', name: 'Hindi', localName: 'हिन्दी (Hindi)' },
            { code: 'mr', name: 'Marathi', localName: 'मराठी (Marathi)' },
          ].map((l, i) => (
            <button
              key={i}
              onClick={() => {
                applySettings({ ...settings, language: l.code === 'hi' ? 'hindi' : 'english' });
                setIsLanguageOpen(false);
                triggerToast(`App language updated to ${l.name}!`);
              }}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                selectedLanguage === l.name
                  ? 'bg-[#fff8f8] border-[#e6007e] text-[#e6007e] font-bold'
                  : 'bg-white border-slate-100 text-[#26181c] hover:bg-slate-50'
              }`}
            >
              <div className="text-left">
                <p className="text-[14px]">{l.name}</p>
                <p className="text-[11px] text-[#8c7077] font-medium mt-0.5">{l.localName}</p>
              </div>
              {selectedLanguage === l.name && (
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
              )}
            </button>
          ))}
        </div>
      </Modal>
      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="App Feedback">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#5a3f47]">We'd love to hear your thoughts on Nexora. Your feedback helps us improve.</p>
          <div className="flex justify-center gap-2 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(star)}
                className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[32px] ${feedbackRating >= star ? 'text-[#e6007e] fill-current' : 'text-[#e0bec6]'}`}>
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you love or what could be better..."
            className="w-full h-32 p-3 bg-[#fff8f8] border border-[#e0bec6] rounded-xl text-[14px] text-[#26181c] placeholder:text-[#8c7077] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] resize-none transition-all"
          />
          <button
            onClick={handleSubmitFeedback}
            className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md transition-all hover:bg-[#8e004b] active:scale-95 mt-2 cursor-pointer"
          >
            Submit Feedback
          </button>
        </div>
      </Modal>

      {/* Modal 10: App Settings */}
      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="App & Privacy Settings">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h5 className="text-[11px] font-bold text-[#8c7077] uppercase tracking-wider mb-1">Push Reminders</h5>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-[13px] font-bold text-[#26181c]">Appointment Reminders</p>
                <p className="text-[11px] text-[#5a3f47]">Send push alerts 1 hour before styling session</p>
              </div>
              <input
                type="checkbox"
                checked={remindersEnabled}
                onChange={(e) => {
                  applySettings({ ...settings, appointment_reminders: e.target.checked });
                  triggerToast(e.target.checked ? 'Reminders turned ON' : 'Reminders turned OFF');
                }}
                className="w-5 h-5 accent-[#e6007e] rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h5 className="text-[11px] font-bold text-[#8c7077] uppercase tracking-wider mb-1">Ambiance Sounds</h5>
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <div>
                <p className="text-[13px] font-bold text-[#26181c]">Auto-play Music</p>
                <p className="text-[11px] text-[#5a3f47]">Play relaxing soundscapes on salon view</p>
              </div>
              <input
                type="checkbox"
                checked={autoPlayAmbiance}
                onChange={(e) => {
                  applySettings({ ...settings, autoplay_ambiance: e.target.checked });
                  triggerToast(e.target.checked ? 'Auto-play turned ON' : 'Auto-play turned OFF');
                }}
                className="w-5 h-5 accent-[#e6007e] rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <h5 className="text-[11px] font-bold text-[#8c7077] uppercase tracking-wider mb-1">Theme</h5>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  applySettings({ ...settings, display_mode: 'light' });
                  triggerToast('Light theme applied.');
                }}
                className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-[#fff8f8] border-[#e6007e] text-[#e6007e]'
                    : 'bg-white border-slate-200 text-[#5a3f47]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">light_mode</span>
                Light Mode
              </button>
              <button
                onClick={() => {
                  applySettings({ ...settings, display_mode: 'dark' });
                  triggerToast('Dark theme applied & synced.');
                }}
                className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-[#fff8f8] border-[#e6007e] text-[#e6007e]'
                    : 'bg-white border-slate-200 text-[#5a3f47]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">dark_mode</span>
                Dark Mode
              </button>
            </div>
          </div>

          <button
            onClick={() => setIsSettingsOpen(false)}
            className="w-full h-11 bg-[#e6007e] hover:bg-[#b90064] text-white font-bold rounded-xl transition-all shadow-md mt-2 cursor-pointer"
          >
            Confirm Settings
          </button>
        </div>
      </Modal>
      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="App Feedback">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#5a3f47]">We'd love to hear your thoughts on Nexora. Your feedback helps us improve.</p>
          <div className="flex justify-center gap-2 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(star)}
                className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[32px] ${feedbackRating >= star ? 'text-[#e6007e] fill-current' : 'text-[#e0bec6]'}`}>
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you love or what could be better..."
            className="w-full h-32 p-3 bg-[#fff8f8] border border-[#e0bec6] rounded-xl text-[14px] text-[#26181c] placeholder:text-[#8c7077] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] resize-none transition-all"
          />
          <button
            onClick={handleSubmitFeedback}
            className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md transition-all hover:bg-[#8e004b] active:scale-95 mt-2 cursor-pointer"
          >
            Submit Feedback
          </button>
        </div>
      </Modal>

      {/* Modal 11: Saved Addresses Manager */}
      <Modal
        isOpen={isAddressesOpen}
        onClose={() => setIsAddressesOpen(false)}
        title={
          addressView === 'list'
            ? 'Saved Addresses'
            : addressView === 'add'
            ? 'Add New Address'
            : 'Edit Address'
        }
      >
        {addressView === 'list' ? (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            {savedAddresses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-100 text-[#8c7077] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px]">location_off</span>
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-[#26181c]">No Saved Addresses</h4>
                  <p className="text-xs text-[#5a3f47] mt-1">Add your address to quickly book premium grooming slots.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewAddressInit}
                  className="mt-2 px-6 h-11 bg-[#b90064] text-white font-bold text-xs rounded-xl hover:bg-[#8e004b] transition-all shadow-md cursor-pointer"
                >
                  + Add Your First Address
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto pr-1 no-scrollbar">
                {savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      addr.isDefault
                        ? 'bg-[#fff8f8] border-[#e0bec6] ring-1 ring-[#e0bec6]'
                        : 'bg-white border-[#e8e8e8] hover:border-slate-300'
                    } flex flex-col gap-3 relative overflow-hidden`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          addr.isDefault ? 'bg-[#ffd9e2] text-[#8e004b]' : 'bg-slate-100 text-[#5a3f47]'
                        }`}>
                          <span className="material-symbols-outlined text-[18px]">
                            {addr.label === 'Home' ? 'home' : addr.label === 'Office' ? 'business' : 'location_on'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[14px] font-extrabold text-[#26181c]">{addr.label}</span>
                          {addr.isDefault && (
                            <span className="ml-2 px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] text-[9px] font-extrabold tracking-wide uppercase rounded-full border border-[#2E7D32]/20">
                              Default
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditAddressInit(addr)}
                          className="w-8 h-8 rounded-full hover:bg-[#ffe8ed] text-[#8c7077] hover:text-[#b90064] flex items-center justify-center transition-colors cursor-pointer"
                          title="Edit Address"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="w-8 h-8 rounded-full hover:bg-red-50 text-[#8c7077] hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                          title="Delete Address"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-[#5a3f47] leading-relaxed pl-1.5 border-l-2 border-[#e8e8e8]">
                      <p className="font-semibold text-[#26181c]">{addr.flatNumber}</p>
                      <p>{addr.street}</p>
                      {addr.landmark && <p className="text-[11px] text-[#8c7077] italic">Landmark: {addr.landmark}</p>}
                      <p className="mt-0.5 font-medium">{addr.city} - {addr.pincode}</p>
                    </div>

                    {!addr.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="text-[11px] text-[#b90064] font-bold hover:underline self-start pl-1.5 cursor-pointer"
                      >
                        Set as default address
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-[#e8e8e8] flex flex-col gap-2">
              <button
                type="button"
                onClick={handleAddNewAddressInit}
                className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl transition-all shadow-md hover:bg-[#8e004b] flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Add New Address
              </button>
              <button
                type="button"
                onClick={() => setIsAddressesOpen(false)}
                className="w-full h-11 bg-white border border-[#e8e8e8] text-[#5a3f47] font-bold rounded-xl transition-all hover:bg-slate-50 cursor-pointer text-xs"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          /* ADD/EDIT ADDRESS FORM (exactly as requested) */
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            
            {/* Map Placeholder Graphic exactly matching HTML snippet */}
            <div 
              className="w-full h-44 rounded-2xl overflow-hidden relative shadow-sm border border-[#e8e8e8]"
              style={{
                backgroundImage: 'linear-gradient(135deg, #fde7f3 0%, #fcf9f8 55%, #f3d4e0 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="material-symbols-outlined text-[72px] text-[#b90064]/15">location_on</span>
              </div>
              <div className="absolute inset-0 flex items-end justify-center pb-3">
                <button
                  type="button"
                  onClick={handleLocateMeInForm}
                  disabled={isLocating}
                  className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-transform border border-slate-100"
                >
                  {isLocating ? (
                    <>
                      <span className="material-symbols-outlined text-[#b90064] text-lg animate-spin">progress_activity</span>
                      <span className="text-[12px] font-bold text-[#26181c]">Locating...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[#b90064] text-lg">my_location</span>
                      <span className="text-[12px] font-bold text-[#26181c]">Locate Me</span>
                    </>
                  )}
                </button>
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-md pointer-events-none">
                <span className="material-symbols-outlined text-[#b90064] text-4xl font-bold fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span>
              </div>
            </div>

            {/* Form Fields Scrollable Area */}
            <div className="flex flex-col gap-4 max-h-[42vh] overflow-y-auto pr-1 no-scrollbar">
              
              {/* Address Label buttons */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#5a3f47] ml-1">Address Label</label>
                <div className="flex gap-2">
                  {['Home', 'Office', 'Other'].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setFormLabel(l)}
                      className={`flex-1 h-11 rounded-xl font-bold text-[13px] transition-all cursor-pointer ${
                        formLabel === l
                          ? 'bg-[#b90064] text-white shadow-md'
                          : 'bg-slate-100 text-[#5a3f47] hover:bg-slate-200/60'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* House / Flat Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#5a3f47] ml-1" htmlFor="formFlat">House / Flat Number</label>
                <input
                  id="formFlat"
                  type="text"
                  value={formFlat}
                  onChange={(e) => setFormFlat(e.target.value)}
                  placeholder="e.g. Flat 201, Pearl Residency"
                  className="w-full h-11 bg-[#fcf9f8] text-[13px] text-[#26181c] rounded-xl px-4 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all font-medium"
                />
              </div>

              {/* Street / Area */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#5a3f47] ml-1" htmlFor="formStreet">Street / Area</label>
                <input
                  id="formStreet"
                  type="text"
                  value={formStreet}
                  onChange={(e) => setFormStreet(e.target.value)}
                  placeholder="e.g. Jhotwara Road"
                  className="w-full h-11 bg-[#fcf9f8] text-[13px] text-[#26181c] rounded-xl px-4 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all font-medium"
                />
              </div>

              {/* Landmark (Optional) */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-bold text-[#5a3f47] ml-1" htmlFor="formLandmark">
                  Landmark <span className="text-[#8c7077] font-normal text-[11px]">(Optional)</span>
                </label>
                <input
                  id="formLandmark"
                  type="text"
                  value={formLandmark}
                  onChange={(e) => setFormLandmark(e.target.value)}
                  placeholder="e.g. Opposite Central Park"
                  className="w-full h-11 bg-[#fcf9f8] text-[13px] text-[#26181c] rounded-xl px-4 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all font-medium"
                />
              </div>

              {/* City and PIN columns */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-[#5a3f47] ml-1" htmlFor="formCity">City / District</label>
                  <input
                    id="formCity"
                    type="text"
                    value={formCity}
                    onChange={(e) => setFormCity(e.target.value)}
                    placeholder="Jaipur"
                    className="w-full h-11 bg-[#fcf9f8] text-[13px] text-[#26181c] rounded-xl px-4 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all font-medium"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[12px] font-bold text-[#5a3f47] ml-1" htmlFor="formPincode">PIN Code</label>
                  <input
                    id="formPincode"
                    type="text"
                    value={formPincode}
                    onChange={(e) => setFormPincode(e.target.value)}
                    placeholder="302001"
                    className="w-full h-11 bg-[#fcf9f8] text-[13px] text-[#26181c] rounded-xl px-4 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all font-medium"
                  />
                </div>
              </div>

              {/* Set as Default Address toggle (exactly matching custom toggle HTML) */}
              <div 
                onClick={() => setFormIsDefault(!formIsDefault)}
                className="mt-1.5 flex items-center gap-3 cursor-pointer select-none"
              >
                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300 ${
                    formIsDefault ? 'bg-[#b90064]/20' : 'bg-slate-200'
                  }`}
                >
                  <div 
                    className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                      formIsDefault ? 'bg-[#b90064]' : 'bg-transparent'
                    }`}
                  ></div>
                </div>
                <span className="text-[13px] font-bold text-[#26181c]">Set as default address</span>
              </div>

            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-[#e8e8e8] flex gap-2">
              <button
                type="button"
                onClick={() => setAddressView('list')}
                className="flex-1 h-12 bg-[#fff8f8] border border-[#e0bec6] text-[#b90064] font-bold rounded-xl transition-all hover:bg-[#ffe8ed] cursor-pointer text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAddressForm}
                className="flex-1 h-12 bg-[#b90064] text-white font-bold rounded-xl transition-all shadow-md hover:bg-[#8e004b] cursor-pointer text-sm"
              >
                Save Address
              </button>
            </div>

          </div>
        )}
      </Modal>
      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="App Feedback">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#5a3f47]">We'd love to hear your thoughts on Nexora. Your feedback helps us improve.</p>
          <div className="flex justify-center gap-2 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setFeedbackRating(star)}
                className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className={`material-symbols-outlined text-[32px] ${feedbackRating >= star ? 'text-[#e6007e] fill-current' : 'text-[#e0bec6]'}`}>
                  star
                </span>
              </button>
            ))}
          </div>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Tell us what you love or what could be better..."
            className="w-full h-32 p-3 bg-[#fff8f8] border border-[#e0bec6] rounded-xl text-[14px] text-[#26181c] placeholder:text-[#8c7077] focus:outline-none focus:border-[#e6007e] focus:ring-1 focus:ring-[#e6007e] resize-none transition-all"
          />
          <button
            onClick={handleSubmitFeedback}
            className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md transition-all hover:bg-[#8e004b] active:scale-95 mt-2 cursor-pointer"
          >
            Submit Feedback
          </button>
        </div>
      </Modal>

      {/* Modal 12: Saved Cards & Payment Methods */}
      <Modal
        isOpen={isPaymentMethodsOpen}
        onClose={() => setIsPaymentMethodsOpen(false)}
        title="Saved Cards & Payment Methods"
      >
        <div className="p-1 flex flex-col gap-5">
          {/* Saved Cards Header */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[14px] font-bold text-[#26181c]">Saved Cards</p>
              <p className="text-[11px] text-[#594047]">Fast 1-click credit & debit card checkout</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAddCardOpen(true)}
              className="px-3 py-1.5 bg-[#e6007e] hover:bg-[#b90064] text-white text-[12px] font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add_card</span>
              <span>+ Add Card</span>
            </button>
          </div>

          {/* Cards List */}
          <div className="flex flex-col gap-2.5">
            {savedCards.map((card) => (
              <div
                key={card.id}
                className="p-3.5 rounded-2xl bg-[#fff8f8] border border-[#e0bec6] flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-[#e8e8e8] flex items-center justify-center text-[#e6007e] shrink-0">
                    <span className="material-symbols-outlined text-[20px]">credit_card</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold text-[#26181c] font-mono">{card.cardNumber}</p>
                      {card.isPrimary && (
                        <span className="px-2 py-0.5 rounded-full bg-[#fde7f3] text-[#e6007e] text-[9px] font-bold uppercase">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#594047]">
                      {card.cardHolder} • Expires {card.expiry}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCard(card.id)}
                  className="w-8 h-8 rounded-full hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Remove Card"
                >
                  <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                </button>
              </div>
            ))}
          </div>

          {/* Saved UPI IDs Header */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#e8e8e8]">
            <div>
              <p className="text-[14px] font-bold text-[#26181c]">Linked UPI IDs</p>
              <p className="text-[11px] text-[#594047]">Google Pay, PhonePe, Paytm & BHIM</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsScanQrOpen(true)}
                className="px-2.5 py-1.5 bg-[#e6007e] hover:bg-[#b90064] text-white text-[12px] font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                title="Scan UPI QR Code using camera"
              >
                <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                <span>Scan QR</span>
              </button>
              <button
                type="button"
                onClick={() => setIsAddUpiOpen(true)}
                className="px-2.5 py-1.5 bg-[#8e004b] hover:bg-[#58002c] text-white text-[12px] font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add UPI</span>
              </button>
            </div>
          </div>

          {/* UPI List */}
          <div className="flex flex-col gap-2.5">
            {savedUpis.map((upi) => (
              <div
                key={upi.id}
                className="p-3.5 rounded-2xl bg-[#fff8f8] border border-[#e0bec6] flex items-center justify-between shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#dbe1ff] text-[#00174b] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold text-[#26181c] font-mono">{upi.upiId}</p>
                      {upi.isVerified && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[11px]">check</span>
                          Verified
                        </span>
                      )}
                      {upi.isQrScanned && (
                        <span className="px-1.5 py-0.5 rounded-md bg-[#fde7f3] text-[#e6007e] text-[9px] font-bold uppercase flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[10px]">qr_code_2</span>
                          QR
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#594047]">{upi.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteUpi(upi.id)}
                  className="w-8 h-8 rounded-full hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Remove UPI ID"
                >
                  <span className="material-symbols-outlined text-[18px]">delete_outline</span>
                </button>
              </div>
            ))}
          </div>

          {/* Recently Scanned List Component */}
          <RecentlyScannedUpiList onDeleteUpi={handleDeleteUpi} />

          {/* Dedicated Scan UPI QR Banner */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#ffe8ed] to-[#fde7f3] border border-[#fcd5e8] flex items-center justify-between gap-2 mt-1 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#e6007e] text-white flex items-center justify-center shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#26181c]">Scan UPI QR Code</p>
                <p className="text-[11px] text-[#594047]">Use camera or gallery QR to link instantly</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsScanQrOpen(true)}
              className="px-3 py-2 bg-[#e6007e] text-white text-[12px] font-bold rounded-xl shrink-0 cursor-pointer hover:bg-[#b90064] shadow-xs flex items-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">photo_camera</span>
              <span>Scan QR</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Card Modal */}
      <AddCardModal
        isOpen={isAddCardOpen}
        onClose={() => setIsAddCardOpen(false)}
        onCardAdded={handleCardAdded}
      />

      {/* Add UPI Modal */}
      <AddUpiModal
        isOpen={isAddUpiOpen}
        onClose={() => {
          setIsAddUpiOpen(false);
          setPrefilledUpiInput('');
        }}
        onUpiAdded={handleUpiAdded}
        initialUpiInput={prefilledUpiInput}
        onOpenScanner={() => {
          setIsAddUpiOpen(false);
          setIsScanQrOpen(true);
        }}
      />

      {/* Scan UPI QR Code Modal */}
      <ScanUpiQrModal
        isOpen={isScanQrOpen}
        onClose={() => setIsScanQrOpen(false)}
        onUpiScanned={handleUpiAdded}
        onUpiParsed={(scannedUpiId) => {
          setPrefilledUpiInput(scannedUpiId);
          setIsScanQrOpen(false);
          setIsAddUpiOpen(true);
          triggerToast(`Parsed QR: ${scannedUpiId}`);
        }}
      />

      {/* Modal: Install App */}
      <Modal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} title="Install Application">
        <InstallApp 
          onClose={() => setIsInstallModalOpen(false)} 
          onInstall={() => {
            setIsInstallModalOpen(false);
            triggerToast('Nexora app installed successfully on your home screen!');
          }} 
        />
      </Modal>

    </div>
  );
};
