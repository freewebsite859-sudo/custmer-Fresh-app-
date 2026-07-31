// Saved addresses — synced to the EXISTING `addresses` table.
// UI Address shape: { id, label, flatNumber, street, landmark?, city, pincode, isDefault }
// DB columns:        { id, user_id, label, street, landmark, city, state, pincode,
//                      latitude, longitude, is_default, created_at, updated_at }
// flatNumber is persisted as the first line of `street` ("Flat, Street").

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Address } from '../types';

interface AddressRow {
  id: string;
  user_id: string;
  label: string | null;
  street: string | null;
  landmark: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_default: boolean | null;
}

export function rowToAddress(row: AddressRow): Address {
  const streetFull = row.street ?? '';
  // Split back only when we stored "Flat, Street" ourselves (first comma).
  const comma = streetFull.indexOf(',');
  const flatNumber = comma > 0 ? streetFull.slice(0, comma).trim() : '';
  const street = comma > 0 ? streetFull.slice(comma + 1).trim() : streetFull;
  return {
    id: String(row.id),
    label: row.label ?? 'Home',
    flatNumber,
    street,
    landmark: row.landmark ?? undefined,
    city: row.city ?? '',
    pincode: row.pincode ?? '',
    isDefault: row.is_default === true,
  };
}

export async function loadAddresses(
  client: SupabaseClient,
  userId: string,
): Promise<Address[]> {
  const { data, error } = await client
    .from('addresses')
    .select('id, user_id, label, street, landmark, city, state, pincode, is_default')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => rowToAddress(row as AddressRow));
}

function addressToRow(userId: string, addr: Omit<Address, 'id'>, isDefault: boolean) {
  const streetCombined = addr.flatNumber.trim()
    ? `${addr.flatNumber.trim()}, ${addr.street.trim()}`
    : addr.street.trim();
  return {
    user_id: userId,
    label: addr.label.trim() || 'Home',
    street: streetCombined,
    landmark: addr.landmark?.trim() || null,
    city: addr.city.trim(),
    state: null, // form has no state field — never fabricate one
    pincode: addr.pincode.trim(),
    is_default: isDefault,
  };
}

export async function addAddress(
  client: SupabaseClient,
  userId: string,
  addr: Omit<Address, 'id'>,
  makeDefault: boolean,
): Promise<Address[]> {
  if (makeDefault) {
    await client.from('addresses').update({ is_default: false }).eq('user_id', userId);
  }
  const { error } = await client
    .from('addresses')
    .insert(addressToRow(userId, addr, makeDefault));
  if (error) throw error;
  return loadAddresses(client, userId);
}

export async function updateAddress(
  client: SupabaseClient,
  userId: string,
  addrId: string,
  addr: Omit<Address, 'id'>,
  makeDefault: boolean,
): Promise<Address[]> {
  if (makeDefault) {
    await client.from('addresses').update({ is_default: false }).eq('user_id', userId);
  }
  const row = addressToRow(userId, addr, makeDefault);
  delete (row as Record<string, unknown>).user_id;
  const { error } = await client.from('addresses').update(row).eq('id', addrId);
  if (error) throw error;
  return loadAddresses(client, userId);
}

export async function deleteAddress(
  client: SupabaseClient,
  userId: string,
  addrId: string,
): Promise<Address[]> {
  const { error } = await client.from('addresses').delete().eq('id', addrId);
  if (error) throw error;
  const rest = await loadAddresses(client, userId);
  if (rest.length > 0 && !rest.some((a) => a.isDefault)) {
    await client
      .from('addresses')
      .update({ is_default: true })
      .eq('id', rest[0].id);
    return loadAddresses(client, userId);
  }
  return rest;
}

export async function setDefaultAddress(
  client: SupabaseClient,
  userId: string,
  addrId: string,
): Promise<Address[]> {
  await client.from('addresses').update({ is_default: false }).eq('user_id', userId);
  const { error } = await client
    .from('addresses')
    .update({ is_default: true })
    .eq('id', addrId);
  if (error) throw error;
  return loadAddresses(client, userId);
}

export function subscribeToAddresses(
  client: SupabaseClient,
  userId: string,
  onChange: () => void,
): () => void {
  const channel = client
    .channel(`nxu-addresses-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'addresses', filter: `user_id=eq.${userId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

/** One-time import of device-stored addresses (used by the legacy-data migration). */
export async function importLegacyAddresses(
  client: SupabaseClient,
  userId: string,
  legacy: Array<Omit<Address, 'id'> & { isDefault?: boolean }>,
): Promise<void> {
  const rows = legacy
    .filter((a) => a && typeof a.street === 'string' && a.street.trim())
    .map((a) => addressToRow(userId, a as Omit<Address, 'id'>, a.isDefault === true));
  if (!rows.length) return;
  if (!rows.some((r) => r.is_default)) rows[0].is_default = true;
  const { error } = await client.from('addresses').insert(rows);
  if (error) throw error;
}
