// Shared customer profile — Supabase is the SINGLE source of truth.
// One row per auth user (created by DB trigger handle_new_user).
// Client rule: UPDATE only, never INSERT duplicates (task STEPS 5/10).
// Mutable-by-owner columns are whitelisted; platform_role/is_active are
// server-owned and protected by the nxu_protect_profile_role_fields trigger.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CustomerProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  photo_url: string | null;
  preferred_city: string | null;
  preferred_area: string | null;
  gender: string | null;
  date_of_birth: string | null;
  platform_role: string | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  recently_viewed?: string[] | null;
  loyalty_points?: number | null;
  wallet_balance_paise?: number | null;
}

const SAFE_PROFILE_COLUMNS =
  'id, full_name, phone, photo_url, preferred_city, preferred_area, gender, date_of_birth, platform_role, is_active, created_at, updated_at, recently_viewed';

// Rewards/wallet columns live on the shared profiles row (server truth).
// Kept separate so a schema that lacks them still loads the profile.
const REWARDS_PROFILE_COLUMNS = 'loyalty_points, wallet_balance_paise';

const PROFILE_COLUMNS = `${SAFE_PROFILE_COLUMNS}, ${REWARDS_PROFILE_COLUMNS}`;

export type ProfilePatch = Partial<
  Pick<
    CustomerProfile,
    | 'full_name'
    | 'phone'
    | 'photo_url'
    | 'preferred_city'
    | 'preferred_area'
    | 'gender'
    | 'date_of_birth'
    | 'recently_viewed'
  >
>;

export async function loadProfile(
  client: SupabaseClient,
  userId: string,
): Promise<CustomerProfile | null> {
  const query = () =>
    client
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
  const { data, error } = await query();
  if (error) {
    // Defensive fallback: if the shared schema has no rewards/wallet columns
    // yet, still load the profile without them (never block login on them).
    if (error.code === 'PGRST204' || /could not find|column|does not exist/i.test(error.message)) {
      const { data: safeData, error: safeError } = await client
        .from('profiles')
        .select(SAFE_PROFILE_COLUMNS)
        .eq('id', userId)
        .maybeSingle();
      if (safeError) throw safeError;
      return (safeData as CustomerProfile | null) ?? null;
    }
    throw error;
  }
  return (data as CustomerProfile | null) ?? null;
}

export async function waitForProfile(
  client: SupabaseClient,
  userId: string,
  options?: { attempts?: number; delayMs?: number },
): Promise<CustomerProfile | null> {
  const attempts = Math.max(1, options?.attempts ?? 6);
  const delayMs = Math.max(100, options?.delayMs ?? 350);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const profile = await loadProfile(client, userId);
    if (profile) return profile;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)));
    }
  }

  return null;
}

/** UPDATE-only write. Role/is_active are NEVER sent from the client. */
export async function updateProfile(
  client: SupabaseClient,
  userId: string,
  patch: ProfilePatch,
): Promise<CustomerProfile> {
  const safePatch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    if (key === 'recently_viewed') {
      safePatch[key] = Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 10)
        : [];
      continue;
    }
    safePatch[key] = typeof value === 'string' ? value.trim() || null : value;
  }
  const { data, error } = await client
    .from('profiles')
    .update(safePatch)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) {
    if (error.code === 'PGRST204' || /could not find|column|does not exist/i.test(error.message)) {
      const { data: safeData, error: safeError } = await client
        .from('profiles')
        .update(safePatch)
        .eq('id', userId)
        .select(SAFE_PROFILE_COLUMNS)
        .single();
      if (safeError) throw safeError;
      return safeData as CustomerProfile;
    }
    throw error;
  }
  return data as CustomerProfile;
}

/**
 * Builds a personalized fallback avatar URL (user initials) via the UI Avatars
 * API. Used for Email/Phone sign-ups that have no provider photo. Returns ''
 * when there is no usable name so callers can fall through to an icon.
 */
export function buildInitialsAvatarUrl(name: string | null | undefined): string {
  const clean = (name ?? '').trim();
  if (!clean) return '';
  return (
    `https://ui-avatars.com/api/?name=${encodeURIComponent(clean)}` +
    `&size=256&background=random&bold=true&format=png`
  );
}

/**
 * Normalizes an international phone number into the app's canonical display
 * format (`+91 98765 43210`). Accepts 10-digit and 12-digit (91-prefixed)
 * numbers; other inputs are returned trimmed when they look like a phone.
 */
export function normalizePhoneNumber(raw: string | null | undefined): string | null {
  const digits = (raw ?? '').replace(/[^0-9]/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  const trimmed = (raw ?? '').trim();
  return trimmed.length >= 8 ? trimmed : null;
}

/**
 * Ensures the shared profile row has its default photo + phone set, pulling
 * from the OAuth/user-metadata payload when available and otherwise generating
 * an initials avatar. Only fills fields that are currently missing — it never
 * overwrites a value the user has already saved.
 */
export async function ensureProfileDefaults(
  client: SupabaseClient,
  userId: string,
  source: {
    fullName?: string | null;
    phone?: string | null;
    oauthAvatarUrl?: string | null;
  },
): Promise<CustomerProfile | null> {
  const profile = await loadProfile(client, userId).catch(() => null);
  if (!profile) return null;

  const patch: ProfilePatch = {};

  if (!profile.photo_url) {
    const avatar =
      (source.oauthAvatarUrl ?? '').trim() ||
      buildInitialsAvatarUrl(profile.full_name || source.fullName);
    if (avatar) patch.photo_url = avatar;
  }

  if (!profile.phone) {
    const phone =
      normalizePhoneNumber(source.phone) ||
      normalizePhoneNumber(profile.phone);
    if (phone) patch.phone = phone;
  }

  if (!profile.full_name && (source.fullName ?? '').trim()) {
    patch.full_name = (source.fullName ?? '').trim();
  }

  if (Object.keys(patch).length === 0) return profile;

  try {
    return await updateProfile(client, userId, patch);
  } catch (e) {
    // Never block login just because profile defaults could not be seeded.
    console.warn('Profile defaults seed notice:', (e as Error)?.message || e);
    return profile;
  }
}

const AVATAR_BUCKET = 'avatars';
const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Uploads profile photo to Supabase Storage bucket `avatars` at <uid>/avatar.<ext>
 * and stores the resulting public URL in profiles.photo_url (task STEP 8).
 */
export async function uploadAvatar(
  client: SupabaseClient,
  userId: string,
  file: File,
): Promise<CustomerProfile> {
  const ext = EXT_BY_TYPE[file.type] ?? 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const { error: uploadError } = await client.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });
  if (uploadError) throw uploadError;
  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('Could not build the public avatar URL.');
  }
  return updateProfile(client, userId, { photo_url: data.publicUrl });
}

/** Adds a cache-busting query so every device shows the newest photo. */
export function avatarUrlWithVersion(profile: CustomerProfile | null | undefined): string {
  if (!profile?.photo_url) return '';
  const version = profile.updated_at ? Date.parse(profile.updated_at) : NaN;
  if (Number.isNaN(version)) return profile.photo_url;
  const joiner = profile.photo_url.includes('?') ? '&' : '?';
  return `${profile.photo_url}${joiner}v=${version}`;
}

/** Realtime subscription (task STEP 6): fires on any profiles change for this user. */
export function subscribeToProfile(
  client: SupabaseClient,
  userId: string,
  onChange: (profile: CustomerProfile) => void,
): () => void {
  const channel = client
    .channel(`nxu-profile-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
      (payload) => {
        const row = (payload.new ?? null) as CustomerProfile | null;
        if (row && row.id === userId) onChange(row);
      },
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
