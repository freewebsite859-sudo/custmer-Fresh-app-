// Shared customer profile — Supabase is the SINGLE source of truth.
// One row per auth user (created by DB trigger handle_new_user).
// Client rule: UPDATE only, never INSERT duplicates (task STEPS 5/10).
// Mutable-by-owner columns are whitelisted; platform_role/is_active are
// server-owned and protected by the nxu_protect_profile_role_fields trigger.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CustomerProfile {
  id: string;
  email: string | null;
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
}

const PROFILE_COLUMNS =
  'id, email, full_name, phone, photo_url, preferred_city, preferred_area, gender, date_of_birth, platform_role, is_active, created_at, updated_at';

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
  >
>;

export async function loadProfile(
  client: SupabaseClient,
  userId: string,
): Promise<CustomerProfile | null> {
  const { data, error } = await client
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return (data as CustomerProfile | null) ?? null;
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
    safePatch[key] = typeof value === 'string' ? value.trim() || null : value;
  }
  const { data, error } = await client
    .from('profiles')
    .update(safePatch)
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();
  if (error) throw error;
  return data as CustomerProfile;
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
