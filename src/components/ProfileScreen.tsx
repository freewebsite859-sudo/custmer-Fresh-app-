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
  customerId: string;
  profile: CustomerProfile | null;
  onSaveProfile: (patch: ProfilePatch) => Promise<boolean>;
  onUploadAvatar: (file: File) => Promise<boolean>;
  userEmail: string;
  /** Session-scoped referral state from App (never localStorage). */
  referralCode?: string | null;
  invitedFriendsCount?: number;
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
  userEmail,
  referralCode = null,
  invitedFriendsCount = 0,
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [name, setName] = useState<string>(profile?.full_name ?? '');
  const [email, setEmail] = useState<string>(userEmail);
  const [phone, setPhone] = useState<string>(profile?.phone ?? '');
  const [avatar, setAvatar] = useState<string>(avatarUrlWithVersion(profile ?? null));

  const [settings, setSettings] = useState<CustomerSettings>(SETTINGS_DEFAULTS);
  const selectedLanguage = settings.language === 'hindi' ? 'Hindi' : 'English';
  const remindersEnabled = settings.appointment_reminders;
  const autoPlayAmbiance = settings.autoplay_ambiance;
  const themeMode: 'light' | 'dark' = settings.display_mode === 'dark' ? 'dark' : 'light';

  const [dob, setDob] = useState<string>(profile?.date_of_birth ?? '');
  const [gender, setGender] = useState<string>(profile?.gender ?? '');
  const [preferredCity, setPreferredCity] = useState<string>(profile?.preferred_city ?? 'jaipur');
  const [preferredArea, setPreferredArea] = useState<string>(profile?.preferred_area ?? '');

  useEffect(() => {
    setEmail(userEmail);
  }, [userEmail]);

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setAvatar(avatarUrlWithVersion(profile));
    setDob(profile.date_of_birth ?? '');
    setGender(profile.gender ?? '');
    if (profile.preferred_city) setPreferredCity(profile.preferred_city);
    if (profile.preferred_area !== null) setPreferredArea(profile.preferred_area ?? '');
  }, [profile]);

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
    submitFeedback(supabase, customerId, feedbackRating, feedbackText)
      .then(() => triggerToast('Thank you — your feedback was saved to your account.'))
      .catch((e) => {
        console.warn('Feedback save notice:', e?.message || e);
        triggerToast('Could not save feedback right now.');
      });
    setIsFeedbackOpen(false);
    setFeedbackRating(0);
    setFeedbackText('');
  };

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

  const [formLabel, setFormLabel] = useState<string>('Home');
  const [formFlat, setFormFlat] = useState<string>('');
  const [formStreet, setFormStreet] = useState<string>('');
  const [formLandmark, setFormLandmark] = useState<string>('');
  const [formCity, setFormCity] = useState<string>('Jaipur');
  const [formPincode, setFormPincode] = useState<string>('');
  const [formIsDefault, setFormIsDefault] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [supportMessages, setSupportMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: 'Hi! I am the Nexora automated assistant. Ask me about bookings, payments or your profile.' },
  ]);
  const [supportInput, setSupportInput] = useState('');

  const [toast, setToast] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSaveProfileInternal = async (
    tempName: string,
    tempEmail: string,
    tempPhone: string,
    tempAvatar: string,
    tempDob: string,
    tempGender: string,
    tempCity: string,
    tempArea: string
  ) => {
    // 1. Validation
    if (!tempName.trim()) {
      setNameError('Full Name is required');
      return;
    }
    if (tempName.trim().length < 2) {
      setNameError('Full Name must be at least 2 characters');
      return;
    }
    setNameError(null);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!tempEmail.trim() || !emailRegex.test(tempEmail.trim())) {
      triggerToast('Please enter a valid email address.');
      return;
    }

    const cleanedPhone = tempPhone.replace(/\s+/g, '');
    if (cleanedPhone && cleanedPhone !== '+91' && cleanedPhone.length !== 13) {
      triggerToast('Phone number must be a valid 10-digit number.');
      return;
    }

    setIsSavingProfile(true);

    // 2. Integration with Supabase user metadata & email update
    if (supabase) {
      try {
        const { error: authError } = await supabase.auth.updateUser({
          email: tempEmail.trim().toLowerCase(),
          data: {
            full_name: tempName.trim(),
            mobile: tempPhone.trim() || null,
          }
        });

        if (authError) {
          triggerToast(authError.message || 'Failed to update credentials.');
          setIsSavingProfile(false);
          return;
        }
      } catch (authException: any) {
        console.warn('Auth update exception:', authException);
      }
    }

    // 3. Database profiles table update
    const patch: ProfilePatch = {
      full_name: tempName.trim(),
      phone: tempPhone.trim() || null,
      gender: tempGender.trim() || null,
      date_of_birth: tempDob.trim() || null,
      preferred_city: tempCity,
      preferred_area: tempArea.trim() || null,
    };
    if (tempAvatar && !tempAvatar.startsWith('data:') && tempAvatar !== avatarUrlWithVersion(profile)) {
      patch.photo_url = tempAvatar;
    }
    if (!tempAvatar) {
      patch.photo_url = null;
    }

    const synced = await onSaveProfile(patch);
    setIsSavingProfile(false);
    if (synced) {
      setIsEditOpen(false);

      const emailChanged = tempEmail.trim().toLowerCase() !== email.toLowerCase();
      if (emailChanged) {
        triggerToast('Profile updated! Please check your new email to confirm the change. 📧');
      } else {
        triggerToast('Profile saved & synced! ✨');
      }
    } else {
      triggerToast('Could not sync profile — please try again.');
    }
  };

  const handleDetectLocation = () => {
    if (isDetectingLocation) return;
    if (!('geolocation' in navigator)) {
      triggerToast('Geolocation is not supported.');
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
          const data = await resp.json();
          const addr = data?.address || {};
          const city = addr.city || addr.town || addr.county || '';
          const area = addr.suburb || addr.neighbourhood || addr.residential || '';
          if (city.toLowerCase().includes('jaipur')) setEditFormCity('jaipur');
          if (area) setEditFormArea(area);
          triggerToast('Location detected — verify before saving.');
        } catch {
          triggerToast('Location lookup failed.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => {
        setIsDetectingLocation(false);
        triggerToast('Permission denied or GPS unavailable.');
      },
      { timeout: 10000 }
    );
  };

  const [isCopiedLink, setIsCopiedLink] = useState(false);
  const profileDeepLink = window.location.origin;

  const handleCopyProfileLink = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(profileDeepLink);
    setIsCopiedLink(true);
    triggerToast('Copied!');
    setTimeout(() => setIsCopiedLink(false), 2000);
  };

  const handleShareProfile = async () => {
    const shareData = {
      title: `${name}'s Nexora Beauty Passport`,
      text: `I booked my salon appointment with Nexora — verified salons, secure 25% advance. Try it:`,
      url: profileDeepLink,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      handleCopyProfileLink();
    }
  };

  const handleSendSupportMessage = (text: string) => {
    if (!text.trim()) return;
    setSupportMessages((prev) => [...prev, { sender: 'user', text }]);
    setSupportInput('');
    setTimeout(() => {
      setSupportMessages((prev) => [...prev, { sender: 'bot', text: 'Assistant: ask about bookings, payments or settings. Or create a ticket from Help Home.' }]);
    }, 800);
  };

  const handleInstallApp = () => setIsInstallModalOpen(true);

  const handleDeleteAddress = (addrId: string) => {
    if (!supabase || !customerId) return;
    deleteAddress(supabase, customerId, addrId).then(setSavedAddresses).then(() => triggerToast('Address deleted!'));
  };

  const handleSetDefaultAddress = (addrId: string) => {
    if (!supabase || !customerId) return;
    setDefaultAddress(supabase, customerId, addrId).then(setSavedAddresses).then(() => triggerToast('Default updated!'));
  };

  const resetAddressForm = (defaults?: Partial<Address>) => {
    setFormLabel(defaults?.label ?? 'Home');
    setFormFlat(defaults?.flatNumber ?? '');
    setFormStreet(defaults?.street ?? '');
    setFormLandmark(defaults?.landmark ?? '');
    setFormCity(defaults?.city ?? 'Jaipur');
    setFormPincode(defaults?.pincode ?? '');
    setFormIsDefault(defaults?.isDefault ?? savedAddresses.length === 0);
  };

  const handleAddNewAddressInit = () => {
    setSelectedAddressForEdit(null);
    resetAddressForm();
    setAddressView('add');
  };

  const handleEditAddressInit = (address: Address) => {
    setSelectedAddressForEdit(address);
    resetAddressForm(address);
    setAddressView('edit');
  };

  const handleSaveAddressForm = async () => {
    if (!supabase || !customerId) return;
    if (!formFlat.trim() || !formStreet.trim() || !formPincode.trim()) {
      triggerToast('Required fields missing.');
      return;
    }
    const payload = { label: formLabel, flatNumber: formFlat, street: formStreet, landmark: formLandmark, city: formCity, pincode: formPincode, isDefault: formIsDefault };
    const makeDefault = formIsDefault || savedAddresses.length === 0;
    const op = addressView === 'add' ? addAddress(supabase, customerId, payload, makeDefault) : selectedAddressForEdit ? updateAddress(supabase, customerId, selectedAddressForEdit.id, payload, makeDefault) : null;
    if (op) op.then(setSavedAddresses).then(() => { triggerToast('Saved!'); setAddressView('list'); });
  };

  const handleLocateMeInForm = () => {
    if (!('geolocation' in navigator)) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18`);
        const data = await resp.json();
        const addr = data?.address || {};
        if (addr.postcode) setFormPincode(String(addr.postcode));
        if (addr.city || addr.town) setFormCity(addr.city || addr.town);
        if (addr.road) setFormStreet(addr.road);
        triggerToast('GPS position found.');
      } finally { setIsLocating(false); }
    }, () => setIsLocating(false));
  };

  const upcomingCount = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'PENDING').length;
  const totalSpent = bookings.filter((b) => b.status === 'PAST' || b.status === 'COMPLETED').reduce((acc, curr) => acc + curr.totalAmount, 0);
  const nexoraPoints = Math.floor(totalSpent / 10);

  const [editFormName, setEditFormName] = useState(name);
  const [editFormEmail, setEditFormEmail] = useState(email);
  const [editFormPhone, setEditFormPhone] = useState(phone);
  const [editFormAvatar, setEditFormAvatar] = useState(avatar);
  const [editFormDob, setEditFormDob] = useState(dob);
  const [editFormGender, setEditFormGender] = useState(gender);
  const [editFormCity, setEditFormCity] = useState(preferredCity);
  const [editFormArea, setEditFormArea] = useState(preferredArea);

  const openEditModal = () => {
    setEditFormName(name); setEditFormEmail(email); setEditFormPhone(phone); setEditFormAvatar(avatar);
    setEditFormDob(dob); setEditFormGender(gender); setEditFormCity(preferredCity); setEditFormArea(preferredArea);
    setNameError(null); setIsEditOpen(true);
  };

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onUploadAvatar) return;
    setIsUploadingPhoto(true);
    const ok = await onUploadAvatar(file);
    setIsUploadingPhoto(false);
    if (ok) triggerToast('Photo updated!');
  };

  useEffect(() => {
    if (isEditOpen) setEditFormAvatar(avatarUrlWithVersion(profile));
  }, [profile?.photo_url, profile?.updated_at, isEditOpen]);

  return (
    <div className="flex flex-col w-full max-w-md mx-auto gap-5 pb-40 pt-2 animate-in fade-in relative">
      <input type="file" id="avatar-upload-file-input" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
      {toast && (
        <div className="fixed bottom-32 mb-safe left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm bg-[#26181c] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between z-[300] transition-all border border-[#e6007e]/30">
          <span className="font-semibold text-[13px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-[#e6007e]">verified</span>
            {toast}
          </span>
          <button onClick={() => setToast(null)} className="text-[11px] text-[#ffb0c8] font-bold uppercase cursor-pointer">Dismiss</button>
        </div>
      )}

      <div className="flex items-center justify-between pb-3 border-b border-[#e8e8e8]/80">
        <div className="flex items-center gap-1">
          <button onClick={() => onBack ? onBack() : onNavigate('home')} className="w-10 h-10 -ml-2 rounded-full hover:bg-[#fff0f2] flex items-center justify-center text-[#5a3f47] transition-all cursor-pointer"><span className="material-symbols-outlined text-[24px] text-[#e6007e]">arrow_back</span></button>
          <div><h1 className="text-[24px] font-bold text-[#26181c] font-headline">Profile</h1><p className="text-[12px] text-[#8c7077]">Manage your personal beauty passport</p></div>
        </div>
        <button onClick={() => onNavigate('settings')} className="w-10 h-10 rounded-full hover:bg-[#fff0f2] flex items-center justify-center text-[#5a3f47] transition-all cursor-pointer"><span className="material-symbols-outlined text-[24px] text-[#e6007e]">settings</span></button>
      </div>

      <div className="bg-white rounded-[24px] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-[#e8e8e8] flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#ffd9e2]/30 to-transparent pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="relative">
            <img src={avatar || '/avatars/avatar-1.png'} alt={name} className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-[#e6007e] shadow-xs" />
            <button onClick={openEditModal} className="absolute bottom-0 right-0 w-7 h-7 bg-[#e6007e] text-white rounded-full flex items-center justify-center shadow-md border-2 border-white hover:scale-110 active:scale-95 transition-transform cursor-pointer"><span className="material-symbols-outlined text-[15px]">edit</span></button>
          </div>
          <div className="flex-1 min-w-0 py-1">
            <h2 className="text-[18px] font-bold text-[#26181c] leading-tight truncate">{name || 'Customer'}</h2>
            <p className="text-[13px] text-[#5a3f47] font-medium mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px] text-[#8c7077]">call</span>{phone || 'Not set'}</p>
            <p className="text-[12px] text-[#8c7077] mt-0.5 flex items-center gap-1 truncate"><span className="material-symbols-outlined text-[14px] text-[#8c7077]">mail</span>{email}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-3.5 border-t border-[#e8e8e8]/60">
          <button onClick={() => setIsMembershipOpen(true)} className="bg-[#fff8f8] hover:bg-[#ffe8ed]/60 p-3 rounded-2xl border border-[#ffe8ed] text-left transition-colors cursor-pointer group">
            <div className="flex items-center justify-between text-[#8e004b] mb-0.5"><div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">verified</span><span className="text-[10px] font-extrabold uppercase tracking-wider">Membership</span></div><span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span></div>
            <p className="text-[13px] font-bold text-[#26181c]">Membership Plans</p>
          </button>
          <button onClick={() => onNavigate('rewards')} className="bg-[#fcf9f8] hover:bg-[#fde7f3]/40 p-3 rounded-2xl border border-[#e8e8e8] text-left transition-colors cursor-pointer group">
            <div className="flex items-center justify-between text-[#e6007e] mb-0.5"><div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">stars</span><span className="text-[10px] font-extrabold uppercase tracking-wider">Nexora Points</span></div><span className="material-symbols-outlined text-[14px] opacity-0 group-hover:opacity-100 transition-opacity">chevron_right</span></div>
            <p className="text-[13px] font-bold text-[#26181c]">{nexoraPoints.toLocaleString()} pts</p>
          </button>
        </div>
        <button onClick={() => setIsShareModalOpen(true)} className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-[#fde7f3] via-[#fff0f2] to-[#fde7f3] hover:from-[#e6007e] hover:to-[#b90064] text-[#e6007e] hover:text-white border border-[#fcd5e8] font-bold text-xs flex items-center justify-between transition-all shadow-2xs active:scale-[0.99] cursor-pointer group">
          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">ios_share</span><span>Share Nexora with Friends</span></div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 group-hover:bg-white/20 text-[#26181c] group-hover:text-white border border-[#fcd5e8]/50 group-hover:border-white/30">Share</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => onNavigate('bookings')} className="bg-white p-3.5 rounded-2xl border border-[#e8e8e8] hover:bg-[#fff0f2] active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-xs cursor-pointer"><div className="w-8 h-8 rounded-full bg-[#fde7f3] flex items-center justify-center text-[#e6007e]"><span className="material-symbols-outlined text-[18px]">calendar_today</span></div><span className="text-[16px] font-extrabold text-[#26181c] mt-1">{upcomingCount}</span><span className="text-[10px] text-[#5a3f47] font-semibold">Upcoming</span></button>
        <button onClick={() => onNavigate('favourites')} className="bg-white p-3.5 rounded-2xl border border-[#e8e8e8] hover:bg-[#fff0f2] active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-xs cursor-pointer"><div className="w-8 h-8 rounded-full bg-[#fde7f3] flex items-center justify-center text-[#e6007e]"><span className="material-symbols-outlined text-[18px]">favorite</span></div><span className="text-[16px] font-extrabold text-[#26181c] mt-1">{favoritesCount}</span><span className="text-[10px] text-[#5a3f47] font-semibold">Saved</span></button>
        <button onClick={() => onNavigate('rewards')} className="bg-white p-3.5 rounded-2xl border border-[#e8e8e8] hover:bg-[#fff0f2] active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-xs cursor-pointer"><div className="w-8 h-8 rounded-full bg-[#fde7f3] flex items-center justify-center text-[#e6007e]"><span className="material-symbols-outlined text-[18px]">card_giftcard</span></div><span className="text-[16px] font-extrabold text-[#26181c] mt-1">{nexoraPoints.toLocaleString()}</span><span className="text-[10px] text-[#5a3f47] font-semibold">Points</span></button>
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col">
          <h3 className="text-[12px] font-extrabold text-[#8c7077] uppercase tracking-wider mb-2 px-1">Bookings & Benefits</h3>
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-xs">
            <MenuItem icon="receipt_long" label="My Bookings" badge={upcomingCount > 0 ? upcomingCount : undefined} onClick={() => onNavigate('bookings')} />
            <MenuItem icon="favorite" label="Favourites" badge={favoritesCount > 0 ? favoritesCount : undefined} onClick={() => onNavigate('favourites')} />
            <MenuItem icon="card_giftcard" label="Rewards" onClick={() => onNavigate('rewards')} />
            <MenuItem icon="share_reviews" label="Refer & Earn" onClick={() => setIsReferEarnOpen(true)} />
            <MenuItem icon="ios_share" label="Share Profile Card" onClick={() => setIsShareModalOpen(true)} />
            <MenuItem icon="card_membership" label="Membership" onClick={() => setIsMembershipOpen(true)} />
          </div>
        </div>
        <div className="flex flex-col">
          <h3 className="text-[12px] font-extrabold text-[#8c7077] uppercase tracking-wider mb-2 px-1">Account</h3>
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-xs">
            <MenuItem icon="person" label="Personal Information" onClick={openEditModal} />
            <MenuItem icon="credit_card" label="Saved Cards & Payment Methods" badge={`${savedCards.length + savedUpis.length} Saved`} onClick={() => setIsPaymentMethodsOpen(true)} />
            <MenuItem icon="location_on" label="Saved Addresses" badge={savedAddresses.find(a => a.isDefault)?.label || 'Manage'} onClick={() => onNavigate('saved-addresses')} />
            <MenuItem icon="notifications" label="Notifications" onClick={() => onNavigate('settings')} />
          </div>
        </div>
        <div className="flex flex-col">
          <h3 className="text-[12px] font-extrabold text-[#8c7077] uppercase tracking-wider mb-2 px-1">Help</h3>
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-xs">
            <MenuItem icon="support_agent" label="Contact Support" badge="Online" onClick={() => onNavigate('support')} />
            <MenuItem icon="help_center" label="Frequently Asked Questions" onClick={() => setIsFaqOpen(true)} />
            <MenuItem icon="policy" label="Privacy Policy" onClick={() => onNavigate('privacy')} />
            <MenuItem icon="gavel" label="Terms & Conditions" onClick={() => onNavigate('terms')} />
            <MenuItem icon="receipt_long" label="Cancellation & Refunds" onClick={() => onNavigate('cancellation')} />
          </div>
        </div>
        <div className="flex flex-col">
          <h3 className="text-[12px] font-extrabold text-[#8c7077] uppercase tracking-wider mb-2 px-1">App</h3>
          <div className="bg-white rounded-2xl border border-[#e8e8e8] overflow-hidden shadow-xs">
            <MenuItem icon="language" label="Language" badge={selectedLanguage} onClick={() => setIsLanguageOpen(true)} />
            <MenuItem icon="tune" label="App Settings" onClick={() => onNavigate('settings')} />
            <MenuItem icon="download" label="Install App" badge="PWA" onClick={handleInstallApp} />
            <MenuItem icon="info" label="About Nexora" onClick={() => setIsAboutOpen(true)} />
            <MenuItem icon="reviews" label="App Feedback" onClick={() => setIsFeedbackOpen(true)} />
          </div>
        </div>
        <div className="mt-2">
          <button onClick={() => onNavigate('welcome')} className="w-full flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100/70 active:scale-[0.98] rounded-2xl text-red-600 transition-all text-left shadow-xs border border-red-100/50 cursor-pointer"><span className="material-symbols-outlined text-[20px] font-bold">logout</span><span className="text-[14px] font-extrabold">Log Out</span></button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center pt-6 pb-2 border-t border-[#e8e8e8]/50 text-center gap-1">
        <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#e6007e]">Nexora PWA</span>
        <span className="text-[11px] text-[#8c7077]">Web app — updates apply automatically</span>
        <span className="text-[10px] text-[#8c7077]/80 mt-1">© 2026 Nexora. All rights reserved.</span>
      </div>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Personal Information">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center justify-center py-4 bg-[#fcf9f8] rounded-2xl border border-[#e8e8e8] relative overflow-hidden">
            <div className="relative group">{editFormAvatar ? <img alt="Profile" className="w-24 h-24 rounded-full object-cover shadow-lg ring-4 ring-white" src={editFormAvatar} /> : <div className="w-24 h-24 rounded-full bg-[#fde7f3] flex items-center justify-center ring-4 ring-white shadow-lg"><span className="material-symbols-outlined text-[40px] text-[#e6007e]">person</span></div>}<button type="button" className="absolute bottom-0 right-0 w-8 h-8 bg-[#b90064] text-white rounded-full flex items-center justify-center shadow-md transform hover:scale-105 transition-transform cursor-pointer" onClick={() => document.getElementById('avatar-upload-file-input')?.click()}><span className="material-symbols-outlined text-[18px]">photo_camera</span></button></div>
            <div className="flex flex-col items-center gap-1.5 mt-3 w-full px-4"><div className="flex gap-3 mt-1.5"><button type="button" disabled={isUploadingPhoto} onClick={() => document.getElementById('avatar-upload-file-input')?.click()} className="text-[11px] text-white font-semibold px-4 py-1.5 bg-[#b90064] hover:bg-[#8e004b] rounded-full transition-colors flex items-center gap-1 shadow-xs cursor-pointer disabled:opacity-60"><span className="material-symbols-outlined text-[13px]">{isUploadingPhoto ? 'progress_activity' : 'upload'}</span>{isUploadingPhoto ? 'Uploading…' : 'Upload Photo'}</button>{editFormAvatar ? <button type="button" onClick={() => setEditFormAvatar('')} className="text-[11px] text-[#594047] font-semibold px-3 py-1.5 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">Remove</button> : null}</div><span className="text-[10px] text-[#8c7077] mt-1 text-center">Synced to your Nexora account.</span></div>
          </div>
          <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1 no-scrollbar">
            <div className="bg-[#fff8f8] rounded-2xl p-4 border border-[#e0bec6]/40 flex flex-col gap-4 relative overflow-hidden w-full">
              <div className="flex flex-col gap-1.5 w-full"><label className="text-[12px] font-bold text-[#594047] ml-1 block w-full" htmlFor="fullName">Full Name</label><div className="relative flex items-center w-full"><span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c7077] text-[20px] pointer-events-none z-10">person</span><input id="fullName" type="text" value={editFormName} onChange={(e) => setEditFormName(e.target.value)} className={`w-full h-12 bg-white text-[14px] font-medium text-[#26181c] rounded-xl pl-11 pr-4 py-2.5 border focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all ${nameError ? 'border-red-500' : 'border-[#e8e8e8]'}`} placeholder="Rahul Sharma" /></div></div>
              <div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-[#594047] ml-1" htmlFor="mobile">Mobile Number</label><div className="relative flex items-center"><span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c7077] text-[20px] pointer-events-none">phone_iphone</span><div className="absolute left-11 top-1/2 -translate-y-1/2 flex items-center text-[14px] text-[#26181c] pointer-events-none"><span>+91</span><div className="w-px h-5 bg-[#e8e8e8] mx-2"></div></div><input id="mobile" type="tel" value={editFormPhone.replace('+91 ', '')} onChange={(e) => setEditFormPhone(`+91 ${e.target.value.replace(/[^0-9]/g, '')}`)} className="w-full h-12 bg-white text-[14px] text-[#26181c] rounded-xl pl-24 pr-4 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all" placeholder="98765 43210" /></div></div>
              <div className="flex flex-col gap-1.5"><div className="flex justify-between items-center ml-1"><label className="text-[12px] font-bold text-[#594047]">Email Address</label><div className="bg-[#E8F5E9] text-[#2E7D32] px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase">Active</div></div><div className="relative flex items-center"><span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c7077] text-[20px] pointer-events-none">mail</span><input type="email" value={editFormEmail} onChange={(e) => setEditFormEmail(e.target.value)} className="w-full h-12 bg-white text-[14px] text-[#26181c] rounded-xl pl-11 pr-4 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064] transition-all" placeholder="name@domain.com" /></div></div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#e8e8e8] flex flex-col gap-4 shadow-xs">
              <div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-[#594047] ml-1">Date of Birth</label><div className="relative flex items-center"><span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#8c7077] text-[20px]">calendar_month</span><input type="date" value={editFormDob} onChange={(e) => setEditFormDob(e.target.value)} className="w-full h-12 bg-[#fcf9f8] text-[14px] rounded-xl pl-11 pr-4 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064]" /></div></div>
              <div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-[#594047] ml-1">Gender Preference</label><div className="flex gap-2">{['female', 'male', 'any'].map((g) => (<label key={g} className="flex-1 relative cursor-pointer"><input type="radio" name="gender" value={g} checked={editFormGender === g} onChange={() => setEditFormGender(g)} className="peer sr-only" /><div className="h-11 flex items-center justify-center bg-[#fcf9f8] text-[13px] font-bold rounded-xl border border-[#e8e8e8] peer-checked:bg-[#ffd9e2] peer-checked:text-[#8e004b] peer-checked:border-[#e6007e] transition-all">{g.charAt(0).toUpperCase() + g.slice(1)}</div></label>))}</div></div>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-[#e8e8e8] flex flex-col gap-4 shadow-xs">
              <div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-[#594047] ml-1">Preferred City</label><div className="relative flex items-center"><span className="material-symbols-outlined absolute left-4 text-[#8c7077] text-[20px]">location_city</span><select value={editFormCity} onChange={(e) => setEditFormCity(e.target.value)} className="w-full h-12 bg-[#fcf9f8] rounded-xl pl-11 pr-10 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064] appearance-none font-medium"><option value="jaipur">Jaipur</option><option value="mumbai">Mumbai</option><option value="delhi">Delhi NCR</option><option value="bangalore">Bangalore</option></select><span className="material-symbols-outlined absolute right-4 text-[#8c7077] pointer-events-none">expand_more</span></div></div>
              <div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-[#594047] ml-1">Preferred Area</label><div className="relative flex items-center"><span className="material-symbols-outlined absolute left-4 text-[#8c7077] text-[20px]">pin_drop</span><input type="text" value={editFormArea} onChange={(e) => setEditFormArea(e.target.value)} className="w-full h-12 bg-[#fcf9f8] rounded-xl pl-11 pr-12 border border-[#e8e8e8] focus:outline-none focus:ring-2 focus:ring-[#b90064]" placeholder="e.g. Malviya Nagar" /><button type="button" onClick={handleDetectLocation} disabled={isDetectingLocation} className="absolute right-3 w-8 h-8 text-[#b90064] hover:bg-[#ffe8ed] rounded-full transition-colors flex items-center justify-center cursor-pointer disabled:opacity-60"><span className={`material-symbols-outlined text-[18px] ${isDetectingLocation ? 'animate-spin' : ''}`}>{isDetectingLocation ? 'progress_activity' : 'my_location'}</span></button></div></div>
            </div>
          </div>
          <div className="pt-2 border-t border-[#e8e8e8] flex gap-2">
            <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 h-12 bg-[#fff8f8] border border-[#e0bec6] text-[#b90064] font-bold rounded-xl transition-all cursor-pointer hover:bg-[#ffe8ed]">Cancel</button>
            <button type="button" disabled={isSavingProfile} onClick={() => handleSaveProfileInternal(editFormName, editFormEmail, editFormPhone, editFormAvatar, editFormDob, editFormGender, editFormCity, editFormArea)} className="flex-1 h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md hover:bg-[#8e004b] cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2">{isSavingProfile && (<span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>)}{isSavingProfile ? 'Saving...' : 'Save Changes'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} title="App Feedback">
        <div className="p-5 flex flex-col gap-4">
          <p className="text-[13px] text-[#5a3f47]">Help us improve Nexora with your feedback.</p>
          <div className="flex justify-center gap-2 my-2">{[1, 2, 3, 4, 5].map((star) => (<button key={star} onClick={() => setFeedbackRating(star)} className="transition-transform hover:scale-110 active:scale-95 cursor-pointer"><span className={`material-symbols-outlined text-[32px] ${feedbackRating >= star ? 'text-[#e6007e] fill-current' : 'text-[#e0bec6]'}`}>star</span></button>))}</div>
          <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} placeholder="Tell us what you love or what could be better..." className="w-full h-32 p-3 bg-[#fff8f8] border border-[#e0bec6] rounded-xl text-[14px] placeholder:text-[#8c7077] focus:outline-none focus:border-[#e6007e] resize-none transition-all" />
          <button onClick={handleSubmitFeedback} className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md hover:bg-[#8e004b] active:scale-95 mt-2 cursor-pointer">Submit Feedback</button>
        </div>
      </Modal>

      <Modal isOpen={isReferEarnOpen} onClose={() => setIsReferEarnOpen(false)} title="Refer & Earn">
        {(() => {
          // Referral state comes from App's session state (shared with the
          // Rewards screen) — never from localStorage. A deterministic code
          // derived from the shared profile row is used until the user
          // generates one in the Rewards tab.
          const activeCode =
            referralCode ||
            (profile?.id ? `NEX-${profile.id.slice(0, 4).toUpperCase()}` : null);
          const activeReferralLink = activeCode
            ? `${window.location.origin}/signup?ref=${activeCode}`
            : profileDeepLink;

          return (
            <div className="flex flex-col items-center text-center gap-4 p-2">
              <div className="w-16 h-16 rounded-full bg-[#fde7f3] flex items-center justify-center text-[#e6007e]">
                <span className="material-symbols-outlined text-[32px]">redeem</span>
              </div>

              {activeCode ? (
                <>
                  <h4 className="text-[16px] font-bold text-[#26181c]">Your Referral Code is Live! 🎉</h4>
                  <p className="text-xs text-[#5a3f47] leading-relaxed">
                    Share your unique referral link to invite your friends. When they complete their first booking, you will earn <span className="font-bold text-[#e6007e]">+250 Glow Points</span>!
                  </p>

                  <div className="w-full bg-[#fff8f8] border border-dashed border-[#fcd5e8] p-4 rounded-xl flex items-center justify-between gap-3 mt-1">
                    <div className="text-left min-w-0 flex-1">
                      <span className="text-[10px] uppercase font-bold text-[#8c7077]">Referral Link</span>
                      <p className="text-[13px] font-bold text-[#e6007e] truncate">{activeReferralLink}</p>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(activeReferralLink);
                        triggerToast('Referral link copied! ✨');
                      }}
                      className="px-4 py-2 bg-[#e6007e] text-white text-xs font-bold rounded-lg hover:bg-[#b90064] active:scale-95 shrink-0 cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>

                  <div className="text-xs text-[#8c7077] font-semibold mt-1">
                    You have invited {invitedFriendsCount} friends so far.
                  </div>

                  <button
                    onClick={() => {
                      setIsReferEarnOpen(false);
                      onNavigate('rewards');
                    }}
                    className="w-full h-11 bg-[#b90064] hover:bg-[#8e004b] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">query_stats</span>
                    Track & Simulate Invites
                  </button>
                </>
              ) : (
                <>
                  <h4 className="text-[16px] font-bold text-[#26181c]">Invite Friends & Earn Points</h4>
                  <p className="text-xs text-[#5a3f47] leading-relaxed">
                    Earn <span className="font-bold text-[#e6007e]">250 bonus Glow Points</span> for every friend who joins & books their first salon session. Track details live!
                  </p>

                  <button
                    onClick={() => {
                      setIsReferEarnOpen(false);
                      onNavigate('rewards');
                    }}
                    className="w-full h-11 bg-[#e6007e] hover:bg-[#b90064] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">magic_button</span>
                    Go Generate Your Unique Link
                  </button>
                </>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal isOpen={isMembershipOpen} onClose={() => setIsMembershipOpen(false)} title="Nexora Membership">
        <div className="flex flex-col items-center text-center gap-4 p-2"><div className="w-16 h-16 rounded-full bg-[#fde7f3] flex items-center justify-center text-[#e6007e]"><span className="material-symbols-outlined text-[32px]">workspace_premium</span></div><h4 className="text-[16px] font-bold text-[#26181c]">Membership plans are coming soon</h4><p className="text-xs text-[#5a3f47] mt-2 leading-relaxed">Nexora abhi koi paid membership offer nahi karta. Jab plans launch honge, unke exact benefits aur price yahin list honge — aap tabhi pay karenge jab aapko plan pasand ho.</p><button onClick={() => setIsMembershipOpen(false)} className="w-full h-11 bg-[#b90064] text-white font-bold rounded-xl hover:bg-[#8e004b] transition-colors cursor-pointer">Got it</button></div>
      </Modal>

      <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Share Profile Card">
        <div className="flex flex-col gap-4 items-center text-center">
          <div className="w-full bg-gradient-to-br from-[#26181c] via-[#3a2028] to-[#1a0e12] p-5 rounded-2xl text-white shadow-xl relative overflow-hidden border border-[#e6007e]/30"><div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#e6007e]/30 to-transparent rounded-full blur-2xl pointer-events-none" /><div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3"><div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[20px] text-[#e6007e]">auto_awesome</span><span className="text-[11px] font-extrabold uppercase tracking-widest text-[#ffb0c8]">Nexora Beauty Passport</span></div><span className="px-2.5 py-0.5 rounded-full bg-[#e6007e]/20 text-[#ffb0c8] text-[10px] font-extrabold border border-[#e6007e]/40">Nexora Customer</span></div><div className="flex items-center gap-3.5 text-left mb-4"><img src={avatar || '/avatars/avatar-1.png'} alt={name} className="w-14 h-14 rounded-full object-cover border-2 border-[#e6007e] shadow-md" /><div className="flex-1 min-w-0"><h4 className="text-[16px] font-extrabold text-white truncate">{name || 'Customer'}</h4><p className="text-[11px] text-[#ffb0c8] flex items-center gap-1 mt-0.5"><span className="material-symbols-outlined text-[13px]">location_on</span>{preferredArea || preferredCity}</p><p className="text-[10px] text-white/70 mt-0.5">{bookings.length} bookings on Nexora</p></div></div><div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center justify-between gap-2"><div className="text-left"><span className="text-[9px] uppercase font-extrabold text-[#ffb0c8] tracking-wider block">Book with confidence</span><span className="text-[13px] font-bold text-white">Verified salons · secure 25% advance</span></div><span className="material-symbols-outlined text-[24px] text-[#e6007e]">verified</span></div></div>
          <p className="text-xs text-[#5a3f47] leading-relaxed px-2">Share your Nexora Beauty Passport — live salons, real bookings, backed by your account on every device.</p>
          <div onClick={handleCopyProfileLink} className="w-full flex items-center bg-[#fcf9f8] hover:bg-[#fde7f3]/50 border border-[#e8e8e8] rounded-xl p-1.5 gap-2 cursor-pointer transition-all group"><span className="material-symbols-outlined text-[18px] text-[#8c7077] group-hover:text-[#e6007e] ml-2 transition-colors">link</span><input type="text" readOnly value={profileDeepLink} className="flex-1 text-[11px] font-mono text-[#26181c] bg-transparent focus:outline-none truncate cursor-pointer" /><button className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-all whitespace-nowrap flex items-center gap-1 ${isCopiedLink ? 'bg-emerald-600 text-white shadow-xs' : 'bg-[#fde7f3] text-[#e6007e]'}`}><span className="material-symbols-outlined text-[14px]">{isCopiedLink ? 'check' : 'content_copy'}</span><span>{isCopiedLink ? 'Copied!' : 'Copy Link'}</span></button></div>
          <div className="w-full grid grid-cols-2 gap-2 mt-1"><button onClick={handleShareProfile} className="py-3 px-4 bg-[#e6007e] hover:bg-[#b90064] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"><span className="material-symbols-outlined text-[18px]">share</span>Native Share</button><button onClick={() => { const text = encodeURIComponent(`Check out Nexora — verified salons with secure advance booking: ${profileDeepLink}`); window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank'); }} className="py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"><span className="material-symbols-outlined text-[18px]">chat</span>WhatsApp</button></div>
        </div>
      </Modal>

      <Modal isOpen={isSupportOpen} onClose={() => setIsSupportOpen(false)} title="Nexora Assistant (Automated)">
        <div className="flex flex-col h-[400px]"><div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">{supportMessages.map((m, i) => (<div key={i} className={`max-w-[80%] rounded-2xl p-3 text-xs leading-normal ${m.sender === 'bot' ? 'self-start bg-[#fff8f8] text-[#26181c] border border-[#fcd5e8]' : 'self-end bg-[#e6007e] text-white'}`}>{m.text}</div>))}</div><div className="flex gap-1.5 overflow-x-auto py-2 border-t border-slate-100 whitespace-nowrap hide-scrollbar">{['I need to cancel booking', 'Payment failed', 'Upgrade membership'].map((q, i) => (<button key={i} onClick={() => handleSendSupportMessage(q)} className="px-3 py-1 bg-slate-100 text-[#5a3f47] text-[10px] font-bold rounded-full hover:bg-[#fff0f2] hover:text-[#e6007e] transition-colors">{q}</button>))}</div><div className="flex gap-2 items-center pt-2 border-t border-slate-100"><input type="text" value={supportInput} onChange={(e) => setSupportInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendSupportMessage(supportInput)} placeholder="Ask anything..." className="flex-1 h-10 px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#e6007e] text-xs" /><button onClick={() => handleSendSupportMessage(supportInput)} className="w-10 h-10 bg-[#e6007e] text-white rounded-xl flex items-center justify-center hover:bg-[#b90064] active:scale-95 transition-all"><span className="material-symbols-outlined text-[18px]">send</span></button></div></div>
      </Modal>

      <Modal isOpen={isFaqOpen} onClose={() => setIsFaqOpen(false)} title="Frequently Asked Questions">
        <div className="flex flex-col gap-3.5">{[{ q: 'How do I cancel my booking?', a: 'Manage bookings from the Bookings tab. Same-day customer cancellation and no-show are not refundable.' }, { q: 'How do I pay?', a: 'Checkout shows the exact total and the 25% advance online via Razorpay.' }, { q: 'Where is my data stored?', a: 'In your Nexora account (Supabase). Syncs automatically across devices.' }].map((faq, i) => (<details key={i} className="group p-3 rounded-xl border border-slate-100 bg-slate-50 [&_summary::-webkit-details-marker]:hidden"><summary className="flex items-center justify-between cursor-pointer focus:outline-none select-none"><span className="text-[13px] font-bold text-[#26181c]">{faq.q}</span><span className="material-symbols-outlined text-[18px] text-[#e6007e] transition-transform duration-200 group-open:rotate-180">expand_more</span></summary><p className="text-xs text-[#5a3f47] mt-2 leading-relaxed border-t border-slate-200/50 pt-2">{faq.a}</p></details>))}</div>
      </Modal>

      <Modal isOpen={isPolicyOpen} onClose={() => setIsPolicyOpen(false)} title="Privacy Policy">
        <div className="text-xs text-[#5a3f47] flex flex-col gap-3.5 leading-relaxed"><p className="font-bold text-[#26181c]">Last updated: July 2026</p><p>At Nexora, we take your personal privacy seriously. We collect profile details to personalize your stylist appointments and keep your data synced across devices via Supabase.</p></div>
      </Modal>

      <Modal isOpen={isLanguageOpen} onClose={() => setIsLanguageOpen(false)} title="Select Language">
        <div className="flex flex-col gap-2">{[{ code: 'en', name: 'English' }, { code: 'hi', name: 'Hindi' }].map((l, i) => (<button key={i} onClick={() => { applySettings({ ...settings, language: l.code === 'hi' ? 'hindi' : 'english' }); setIsLanguageOpen(false); triggerToast(`Language updated to ${l.name}!`); }} className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${selectedLanguage === l.name ? 'bg-[#fff8f8] border-[#e6007e] text-[#e6007e] font-bold' : 'bg-white border-slate-100 text-[#26181c] hover:bg-slate-50'}`}><p className="text-[14px]">{l.name}</p>{selectedLanguage === l.name && (<span className="material-symbols-outlined text-[20px]">check_circle</span>)}</button>))}</div>
      </Modal>

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="App & Privacy Settings">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1"><h5 className="text-[11px] font-bold text-[#8c7077] uppercase tracking-wider mb-1">Push Reminders</h5><div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100"><div><p className="text-[13px] font-bold text-[#26181c]">Appointment Reminders</p><p className="text-[11px] text-[#5a3f47]">Send push alerts 1 hour before session</p></div><input type="checkbox" checked={remindersEnabled} onChange={(e) => { applySettings({ ...settings, appointment_reminders: e.target.checked }); triggerToast(e.target.checked ? 'Reminders ON' : 'Reminders OFF'); }} className="w-5 h-5 accent-[#e6007e] rounded cursor-pointer" /></div></div>
          <div className="flex flex-col gap-1"><h5 className="text-[11px] font-bold text-[#8c7077] uppercase tracking-wider mb-1">Ambiance Sounds</h5><div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-100"><div><p className="text-[13px] font-bold text-[#26181c]">Auto-play Music</p><p className="text-[11px] text-[#5a3f47]">Play relaxing soundscapes on salon view</p></div><input type="checkbox" checked={autoPlayAmbiance} onChange={(e) => { applySettings({ ...settings, autoplay_ambiance: e.target.checked }); triggerToast(e.target.checked ? 'Auto-play ON' : 'Auto-play OFF'); }} className="w-5 h-5 accent-[#e6007e] rounded cursor-pointer" /></div></div>
          <div className="flex flex-col gap-1"><h5 className="text-[11px] font-bold text-[#8c7077] uppercase tracking-wider mb-1">Theme</h5><div className="grid grid-cols-2 gap-2"><button onClick={() => { applySettings({ ...settings, display_mode: 'light' }); triggerToast('Light theme applied.'); }} className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1 border transition-all cursor-pointer ${themeMode === 'light' ? 'bg-[#fff8f8] border-[#e6007e] text-[#e6007e]' : 'bg-white border-slate-200 text-[#5a3f47]'}`}>Light Mode</button><button onClick={() => { applySettings({ ...settings, display_mode: 'dark' }); triggerToast('Dark theme applied.'); }} className={`h-11 rounded-xl font-bold text-xs flex items-center justify-center gap-1 border transition-all cursor-pointer ${themeMode === 'dark' ? 'bg-[#fff8f8] border-[#e6007e] text-[#e6007e]' : 'bg-white border-slate-200 text-[#5a3f47]'}`}>Dark Mode</button></div></div>
          <button onClick={() => setIsSettingsOpen(false)} className="w-full h-11 bg-[#e6007e] hover:bg-[#b90064] text-white font-bold rounded-xl transition-all shadow-md mt-2 cursor-pointer">Confirm Settings</button>
        </div>
      </Modal>

      <Modal isOpen={isAddressesOpen} onClose={() => setIsAddressesOpen(false)} title={addressView === 'list' ? 'Saved Addresses' : addressView === 'add' ? 'Add New Address' : 'Edit Address'}>
        {addressView === 'list' ? (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">{savedAddresses.length === 0 ? (<div className="flex flex-col items-center justify-center py-10 text-center gap-3"><div className="w-16 h-16 rounded-full bg-slate-100 text-[#8c7077] flex items-center justify-center"><span className="material-symbols-outlined text-[32px]">location_off</span></div><h4 className="text-[15px] font-bold text-[#26181c]">No Saved Addresses</h4><button type="button" onClick={handleAddNewAddressInit} className="mt-2 px-6 h-11 bg-[#b90064] text-white font-bold text-xs rounded-xl hover:bg-[#8e004b] transition-all shadow-md cursor-pointer">+ Add Your First Address</button></div>) : (<div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto no-scrollbar">{savedAddresses.map((addr) => (<div key={addr.id} className={`p-4 rounded-2xl border transition-all ${addr.isDefault ? 'bg-[#fff8f8] border-[#e0bec6] ring-1 ring-[#e0bec6]' : 'bg-white border-[#e8e8e8] hover:border-slate-300'} flex flex-col gap-3 relative overflow-hidden`}><div className="flex items-start justify-between gap-2"><div className="flex items-center gap-2.5"><div className={`w-9 h-9 rounded-full flex items-center justify-center ${addr.isDefault ? 'bg-[#ffd9e2] text-[#8e004b]' : 'bg-slate-100 text-[#5a3f47]'}`}><span className="material-symbols-outlined text-[18px]">{addr.label === 'Home' ? 'home' : addr.label === 'Office' ? 'business' : 'location_on'}</span></div><div><span className="text-[14px] font-extrabold text-[#26181c]">{addr.label}</span>{addr.isDefault && (<span className="ml-2 px-2 py-0.5 bg-[#E8F5E9] text-[#2E7D32] text-[9px] font-extrabold tracking-wide uppercase rounded-full border border-[#2E7D32]/20">Default</span>)}</div></div><div className="flex gap-1"><button type="button" onClick={() => handleEditAddressInit(addr)} className="w-8 h-8 rounded-full hover:bg-[#ffe8ed] text-[#8c7077] hover:text-[#b90064] flex items-center justify-center transition-colors cursor-pointer"><span className="material-symbols-outlined text-[18px]">edit</span></button><button type="button" onClick={() => handleDeleteAddress(addr.id)} className="w-8 h-8 rounded-full hover:bg-red-50 text-[#8c7077] hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"><span className="material-symbols-outlined text-[18px]">delete</span></button></div></div><div className="text-xs text-[#5a3f47] leading-relaxed pl-1.5 border-l-2 border-[#e8e8e8]"><p className="font-semibold text-[#26181c]">{addr.flatNumber}</p><p>{addr.street}</p>{addr.landmark && <p className="text-[11px] text-[#8c7077] italic">Landmark: {addr.landmark}</p>}<p className="mt-0.5 font-medium">{addr.city} - {addr.pincode}</p></div>{!addr.isDefault && (<button type="button" onClick={() => handleSetDefaultAddress(addr.id)} className="text-[11px] text-[#b90064] font-bold hover:underline self-start pl-1.5 cursor-pointer">Set as default address</button>)}</div>))}</div>)}<div className="pt-2 border-t border-[#e8e8e8] flex flex-col gap-2"><button type="button" onClick={handleAddNewAddressInit} className="w-full h-12 bg-[#b90064] text-white font-bold rounded-xl transition-all shadow-md hover:bg-[#8e004b] flex items-center justify-center gap-2 cursor-pointer text-sm"><span className="material-symbols-outlined text-[18px]">add</span>Add New Address</button><button type="button" onClick={() => setIsAddressesOpen(false)} className="w-full h-11 bg-white border border-[#e8e8e8] text-[#5a3f47] font-bold rounded-xl transition-all hover:bg-slate-50 cursor-pointer text-xs">Close</button></div></div>
        ) : (
          <div className="flex flex-col gap-4 animate-in fade-in duration-200"><div className="w-full h-44 rounded-2xl overflow-hidden relative shadow-sm border border-[#e8e8e8]" style={{ backgroundImage: 'linear-gradient(135deg, #fde7f3 0%, #fcf9f8 55%, #f3d4e0 100%)', backgroundSize: 'cover', backgroundPosition: 'center' }}><div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="material-symbols-outlined text-[72px] text-[#b90064]/15">location_on</span></div><div className="absolute inset-0 flex items-end justify-center pb-3"><button type="button" onClick={handleLocateMeInForm} disabled={isLocating} className="bg-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-transform border border-slate-100">{isLocating ? (<><span className="material-symbols-outlined text-[#b90064] text-lg animate-spin">progress_activity</span><span className="text-[12px] font-bold text-[#26181c]">Locating...</span></>) : (<><span className="material-symbols-outlined text-[#b90064] text-lg">my_location</span><span className="text-[12px] font-bold text-[#26181c]">Locate Me</span></>)}</button></div><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow-md pointer-events-none"><span className="material-symbols-outlined text-[#b90064] text-4xl font-bold fill-current" style={{ fontVariationSettings: "'FILL' 1" }}>location_on</span></div></div><div className="flex flex-col gap-4 max-h-[42vh] overflow-y-auto no-scrollbar"><div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-[#5a3f47] ml-1">Address Label</label><div className="flex gap-2">{['Home', 'Office', 'Other'].map((l) => (<button key={l} type="button" onClick={() => setFormLabel(l)} className={`flex-1 h-11 rounded-xl font-bold text-[13px] transition-all cursor-pointer ${formLabel === l ? 'bg-[#b90064] text-white shadow-md' : 'bg-slate-100 text-[#5a3f47] hover:bg-slate-200/60'}`}>{l}</button>))}</div></div><div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-[#5a3f47] ml-1">House / Flat Number</label><input type="text" value={formFlat} onChange={(e) => setFormFlat(e.target.value)} placeholder="e.g. Flat 201" className="w-full h-11 bg-[#fcf9f8] rounded-xl px-4 border border-[#e8e8e8] font-medium" /></div><div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-[#5a3f47] ml-1">Street / Area</label><input type="text" value={formStreet} onChange={(e) => setFormStreet(e.target.value)} placeholder="e.g. Jhotwara Road" className="w-full h-11 bg-[#fcf9f8] rounded-xl px-4 border border-[#e8e8e8] font-medium" /></div><div className="grid grid-cols-2 gap-3"><div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-[#5a3f47] ml-1">City</label><input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)} className="w-full h-11 bg-[#fcf9f8] rounded-xl px-4 border border-[#e8e8e8] font-medium" /></div><div className="flex flex-col gap-1.5"><label className="text-[12px] font-bold text-[#5a3f47] ml-1">PIN Code</label><input type="text" value={formPincode} onChange={(e) => setFormPincode(e.target.value)} className="w-full h-11 bg-[#fcf9f8] rounded-xl px-4 border border-[#e8e8e8] font-medium" /></div></div><div onClick={() => setFormIsDefault(!formIsDefault)} className="mt-1.5 flex items-center gap-3 cursor-pointer select-none"><div className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors duration-300 ${formIsDefault ? 'bg-[#b90064]/20' : 'bg-slate-200'}`}><div className={`w-3 h-3 rounded-full transition-colors duration-300 ${formIsDefault ? 'bg-[#b90064]' : 'bg-transparent'}`}></div></div><span className="text-[13px] font-bold text-[#26181c]">Set as default address</span></div></div><div className="pt-2 border-t border-[#e8e8e8] flex gap-2"><button type="button" onClick={() => setAddressView('list')} className="flex-1 h-12 bg-[#fff8f8] border border-[#e0bec6] text-[#b90064] font-bold rounded-xl transition-all hover:bg-[#ffe8ed] cursor-pointer text-sm">Cancel</button><button type="button" onClick={handleSaveAddressForm} className="flex-1 h-12 bg-[#b90064] text-white font-bold rounded-xl shadow-md hover:bg-[#8e004b] cursor-pointer text-sm">Save Address</button></div></div>
        )}
      </Modal>

      <Modal isOpen={isPaymentMethodsOpen} onClose={() => setIsPaymentMethodsOpen(false)} title="Saved Cards & Payment Methods">
        <div className="p-1 flex flex-col gap-5"><div className="flex items-center justify-between gap-2"><div><p className="text-[14px] font-bold text-[#26181c]">Saved Cards</p><p className="text-[11px] text-[#594047]">Fast 1-click card checkout</p></div><button type="button" onClick={() => setIsAddCardOpen(true)} className="px-3 py-1.5 bg-[#e6007e] text-white text-[12px] font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"><span className="material-symbols-outlined text-[16px]">add_card</span><span>+ Add Card</span></button></div><div className="flex flex-col gap-2.5">{savedCards.map((card) => (<div key={card.id} className="p-3.5 rounded-2xl bg-[#fff8f8] border border-[#e0bec6] flex items-center justify-between shadow-xs"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-white border border-[#e8e8e8] flex items-center justify-center text-[#e6007e] shrink-0"><span className="material-symbols-outlined text-[20px]">credit_card</span></div><div><div className="flex items-center gap-2"><p className="text-[13px] font-bold text-[#26181c] font-mono">{card.cardNumber}</p>{card.isPrimary && (<span className="px-2 py-0.5 rounded-full bg-[#fde7f3] text-[#e6007e] text-[9px] font-bold uppercase">Primary</span>)}</div><p className="text-[11px] text-[#594047]">{card.cardHolder} • Expires {card.expiry}</p></div></div><button type="button" onClick={() => handleDeleteCard(card.id)} className="w-8 h-8 rounded-full hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"><span className="material-symbols-outlined text-[18px]">delete_outline</span></button></div>))}</div><div className="flex items-center justify-between gap-2 pt-2 border-t border-[#e8e8e8]"><div><p className="text-[14px] font-bold text-[#26181c]">Linked UPI IDs</p></div><div className="flex items-center gap-1.5 shrink-0"><button type="button" onClick={() => setIsScanQrOpen(true)} className="px-2.5 py-1.5 bg-[#e6007e] text-white text-[12px] font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"><span className="material-symbols-outlined text-[16px]">qr_code_scanner</span><span>Scan QR</span></button><button type="button" onClick={() => setIsAddUpiOpen(true)} className="px-2.5 py-1.5 bg-[#8e004b] text-white text-[12px] font-bold rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"><span className="material-symbols-outlined text-[16px]">add</span><span>Add UPI</span></button></div></div><div className="flex flex-col gap-2.5">{savedUpis.map((upi) => (<div key={upi.id} className="p-3.5 rounded-2xl bg-[#fff8f8] border border-[#e0bec6] flex items-center justify-between shadow-xs"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#dbe1ff] text-[#00174b] flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[20px]">account_balance_wallet</span></div><div><div className="flex items-center gap-2"><p className="text-[13px] font-bold text-[#26181c] font-mono">{upi.upiId}</p>{upi.isVerified && (<span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase flex items-center gap-0.5"><span className="material-symbols-outlined text-[11px]">check</span>Verified</span>)}</div><p className="text-[11px] text-[#594047]">{upi.name}</p></div></div><button type="button" onClick={() => handleDeleteUpi(upi.id)} className="w-8 h-8 rounded-full hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"><span className="material-symbols-outlined text-[18px]">delete_outline</span></button></div>))}</div><RecentlyScannedUpiList onDeleteUpi={handleDeleteUpi} /></div>
      </Modal>

      <AddCardModal isOpen={isAddCardOpen} onClose={() => setIsAddCardOpen(false)} onCardAdded={handleCardAdded} />
      <AddUpiModal isOpen={isAddUpiOpen} onClose={() => { setIsAddUpiOpen(false); setPrefilledUpiInput(''); }} onUpiAdded={handleUpiAdded} initialUpiInput={prefilledUpiInput} onOpenScanner={() => { setIsAddUpiOpen(false); setIsScanQrOpen(true); }} />
      <ScanUpiQrModal isOpen={isScanQrOpen} onClose={() => setIsScanQrOpen(false)} onUpiScanned={handleUpiAdded} onUpiParsed={(id) => { setPrefilledUpiInput(id); setIsScanQrOpen(false); setIsAddUpiOpen(true); }} />
      <Modal isOpen={isInstallModalOpen} onClose={() => setIsInstallModalOpen(false)} title="Install Application"><InstallApp onClose={() => setIsInstallModalOpen(false)} onInstall={async () => false /* no browser prompt here — guide will show */} /></Modal>

    </div>
  );
};
