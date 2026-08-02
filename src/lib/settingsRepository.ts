// Customer settings — one row per user in customer_settings (settings jsonb).
// One device edits → Supabase Realtime pushes to every logged-in device.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CustomerSettings {
  push_notifications: boolean;
  booking_updates: boolean;
  appointment_reminders: boolean;
  rewards_updates: boolean;
  offers_promotions: boolean;
  email_notifications: boolean;
  auto_location: boolean;
  autoplay_ambiance: boolean;
  display_mode: 'device' | 'light' | 'dark';
  language: string;
}

export const SETTINGS_DEFAULTS: CustomerSettings = {
  push_notifications: true,
  booking_updates: true,
  appointment_reminders: true,
  rewards_updates: true,
  offers_promotions: true,
  email_notifications: true,
  auto_location: true,
  autoplay_ambiance: false,
  display_mode: 'device',
  language: 'english',
};

const BOOL_KEYS: Array<keyof CustomerSettings> = [
  'push_notifications',
  'booking_updates',
  'appointment_reminders',
  'rewards_updates',
  'offers_promotions',
  'email_notifications',
  'auto_location',
  'autoplay_ambiance',
];

export function normalizeSettings(raw: unknown): CustomerSettings {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const merged: CustomerSettings = { ...SETTINGS_DEFAULTS };
  for (const key of BOOL_KEYS) {
    if (typeof source[key] === 'boolean') {
      (merged as unknown as Record<string, unknown>)[key] = source[key];
    }
  }
  const mode = source.display_mode;
  merged.display_mode = mode === 'light' || mode === 'dark' ? mode : 'device';
  merged.language = typeof source.language === 'string' && source.language ? source.language : 'english';
  return merged;
}

const isMissingTableError = (error: { code?: string; message?: string } | null): boolean => {
  if (!error) return false;
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /could not find a table|relation .* does not exist/i.test(error.message || '')
  );
};

export async function loadSettings(
  client: SupabaseClient,
  userId: string,
): Promise<{ settings: CustomerSettings; exists: boolean }> {
  const { data, error } = await client
    .from('customer_settings')
    .select('settings')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return { settings: SETTINGS_DEFAULTS, exists: false };
    throw error;
  }
  return { settings: normalizeSettings(data?.settings), exists: Boolean(data) };
}

/** Single-row upsert (PK user_id) — one settings row per customer, never duplicates. */
export async function saveSettings(
  client: SupabaseClient,
  userId: string,
  settings: CustomerSettings,
): Promise<void> {
  const { error } = await client
    .from('customer_settings')
    .upsert({ user_id: userId, settings }, { onConflict: 'user_id' });
  if (error) throw error;
}

export function subscribeToSettings(
  client: SupabaseClient,
  userId: string,
  onChange: (settings: CustomerSettings) => void,
): () => void {
  const channel = client
    .channel(`nxu-settings-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'customer_settings', filter: `user_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as { settings?: unknown } | null;
        if (row) onChange(normalizeSettings(row.settings));
      },
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

/** One-time import of pre-unification localStorage toggles into a settings object. */
export function settingsFromLegacyLocalStorage(read: (key: string) => string | null): Partial<CustomerSettings> {
  const out: Partial<CustomerSettings> = {};
  const bool = (key: string): boolean | undefined => {
    const raw = read(key);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return undefined;
  };
  const push = bool('settings_push_notifs');
  if (push !== undefined) out.push_notifications = push;
  const booking = bool('settings_booking_updates');
  if (booking !== undefined) out.booking_updates = booking;
  const reminders = bool('settings_appt_reminders');
  if (reminders !== undefined) out.appointment_reminders = reminders;
  const rewards = bool('settings_rewards_updates');
  if (rewards !== undefined) out.rewards_updates = rewards;
  const offers = bool('settings_offers_promo');
  if (offers !== undefined) out.offers_promotions = offers;
  const email = bool('settings_email_notifs');
  if (email !== undefined) out.email_notifications = email;
  const autoLoc = bool('settings_use_loc_auto');
  if (autoLoc !== undefined) out.auto_location = autoLoc;
  const autoPlay = bool('autoplay_ambiance');
  if (autoPlay !== undefined) out.autoplay_ambiance = autoPlay;
  const mode = read('settings_display_mode');
  if (mode === 'light' || mode === 'dark') out.display_mode = mode;
  const lang = read('settings_language');
  if (lang) out.language = lang;
  return out;
}
