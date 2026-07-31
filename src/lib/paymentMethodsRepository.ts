// Saved UPI IDs / cards — synced to saved_payment_methods (new owner-approved table).
// Only display-meta is stored (UPI id, masked card); no PANs/secrets ever.

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SavedUpi } from '../components/AddUpiModal';
import type { SavedCard } from '../components/AddCardModal';

interface MethodRow {
  id: string;
  user_id: string;
  method: 'upi' | 'card';
  label: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

function rowToUpi(row: MethodRow): SavedUpi {
  const d = row.details ?? {};
  return {
    id: String(row.id),
    upiId: String(d.upi_id ?? ''),
    name: String(d.name ?? row.label ?? ''),
    provider: String(d.provider ?? ''),
    isVerified: d.verified === true,
    isQrScanned: d.qr_scanned === true,
    scannedAt: typeof d.scanned_at === 'string' ? d.scanned_at : undefined,
  };
}

function rowToCard(row: MethodRow): SavedCard {
  const d = row.details ?? {};
  return {
    id: String(row.id),
    cardNumber: String(d.card_number_masked ?? ''),
    cardHolder: String(d.card_holder ?? row.label ?? ''),
    expiry: String(d.expiry ?? ''),
    network: (d.network as SavedCard['network']) ?? 'visa',
    isPrimary: d.is_primary === true,
  };
}

export async function loadPaymentMethods(
  client: SupabaseClient,
  userId: string,
): Promise<{ upis: SavedUpi[]; cards: SavedCard[] }> {
  const { data, error } = await client
    .from('saved_payment_methods')
    .select('id, user_id, method, label, details, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as MethodRow[];
  return {
    upis: rows.filter((r) => r.method === 'upi').map(rowToUpi),
    cards: rows.filter((r) => r.method === 'card').map(rowToCard),
  };
}

export async function addUpiMethod(
  client: SupabaseClient,
  userId: string,
  upi: Omit<SavedUpi, 'id'>,
): Promise<void> {
  const { error } = await client.from('saved_payment_methods').insert({
    user_id: userId,
    method: 'upi',
    label: upi.name || upi.upiId,
    details: {
      upi_id: upi.upiId,
      name: upi.name,
      provider: upi.provider,
      verified: upi.isVerified === true,
      qr_scanned: upi.isQrScanned === true,
      ...(upi.scannedAt ? { scanned_at: upi.scannedAt } : {}),
    },
  });
  if (error) throw error;
}

export async function addCardMethod(
  client: SupabaseClient,
  userId: string,
  card: Omit<SavedCard, 'id'>,
): Promise<void> {
  const { error } = await client.from('saved_payment_methods').insert({
    user_id: userId,
    method: 'card',
    label: card.cardHolder || 'Card',
    details: {
      card_number_masked: card.cardNumber,
      card_holder: card.cardHolder,
      expiry: card.expiry,
      network: card.network,
      is_primary: card.isPrimary === true,
    },
  });
  if (error) throw error;
}

export async function deletePaymentMethod(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client.from('saved_payment_methods').delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToPaymentMethods(
  client: SupabaseClient,
  userId: string,
  onChange: () => void,
): () => void {
  const channel = client
    .channel(`nxu-paymethods-${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'saved_payment_methods', filter: `user_id=eq.${userId}` },
      () => onChange(),
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}

/** One-time import of device-stored UPIs/cards (used by the legacy-data migration). */
export async function importLegacyPaymentMethods(
  client: SupabaseClient,
  userId: string,
  upis: Array<Omit<SavedUpi, 'id'>>,
  cards: Array<Omit<SavedCard, 'id'>>,
): Promise<void> {
  const rows: Record<string, unknown>[] = [];
  for (const upi of upis) {
    if (!upi?.upiId) continue;
    rows.push({
      user_id: userId,
      method: 'upi',
      label: upi.name || upi.upiId,
      details: {
        upi_id: upi.upiId,
        name: upi.name ?? '',
        provider: upi.provider ?? '',
        verified: upi.isVerified === true,
        qr_scanned: upi.isQrScanned === true,
      },
    });
  }
  for (const card of cards) {
    if (!card?.cardNumber) continue;
    rows.push({
      user_id: userId,
      method: 'card',
      label: card.cardHolder || 'Card',
      details: {
        card_number_masked: card.cardNumber,
        card_holder: card.cardHolder ?? '',
        expiry: card.expiry ?? '',
        network: card.network ?? 'visa',
        is_primary: card.isPrimary === true,
      },
    });
  }
  if (!rows.length) return;
  const { error } = await client.from('saved_payment_methods').insert(rows);
  if (error) throw error;
}
