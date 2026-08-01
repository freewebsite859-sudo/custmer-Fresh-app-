// One-time migration helper: pre-unification builds stored customer data in
// localStorage. After the first server sync we import values that have no
// server-side equivalent yet, then PURGE the local copies.
// Supabase is the single source of truth (task STEP 7).
// Device-only UI flags (install prompts, browsing location, recent views) keep
// using localStorage legitimately and are NOT touched here.

export const LEGACY_MIGRATION_FLAG = 'nxu_migrated_v1';

const PURGE_KEYS = [
  // profile copies
  'profile_name',
  'profile_email',
  'profile_phone',
  'profile_avatar',
  'profile_dob',
  'profile_gender',
  'profile_city',
  'profile_area',
  'profile_language',
  'profile_theme',
  'reminders_enabled',
  'autoplay_ambiance',
  // favorites copies
  'nexora_favorites',
  'nexora_favorite_pros',
  'nexora_favorite_services',
  // settings copies
  'settings_push_notifs',
  'settings_booking_updates',
  'settings_appt_reminders',
  'settings_rewards_updates',
  'settings_offers_promo',
  'settings_email_notifs',
  'settings_use_loc_auto',
  'settings_display_mode',
  'settings_language',
  'user_location_name',
  // saved data copies
  'nexora_saved_addresses',
  'nexora_saved_upis',
  'nexora_saved_cards',
  'nexora_support_tickets',
  'nexora_feedback',
  'nexora_bookings',
  'nexora_notifications',
];

export function purgeLegacyLocalStorage(): void {
  for (const key of PURGE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // storage unavailable — nothing to purge
    }
  }
}

// Business-data keys that previously lived in localStorage are NEVER allowed
// back after Phase 1 (reviews, referral code, invited friends). They are
// purged unconditionally on every login, regardless of the one-time migration
// flag, so devices upgraded from older builds get cleaned too.
// Device-only UI/PWA preferences (install prompts, browsing location) are
// intentionally NOT touched here.
const OBSOLETE_BUSINESS_PREFIXES = [
  'nexora_service_reviews_',
  'nxu_ref_code_',
  'nxu_invited_friends_',
];

export function purgeObsoleteBusinessKeys(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (OBSOLETE_BUSINESS_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        doomed.push(key);
      }
    }
    for (const key of doomed) {
      localStorage.removeItem(key);
    }
  } catch {
    // storage unavailable — nothing to purge
  }
}

export function readLegacyJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function readLegacyValue(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
