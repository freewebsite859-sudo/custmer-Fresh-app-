// Customer favourites — synced to the EXISTING backend tables
// favorite_salons / favorite_services / favorite_staff (no new DB objects).
// Composite-key tables: one (user_id, item) row each — duplicates impossible.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CustomerFavorites {
  salonIds: string[];
  serviceIds: string[];
  staffIds: string[];
}

export async function loadFavorites(
  client: SupabaseClient,
  userId: string,
): Promise<CustomerFavorites> {
  const [salons, services, staff] = await Promise.all([
    client.from('favorite_salons').select('salon_id').eq('user_id', userId),
    client.from('favorite_services').select('service_id').eq('user_id', userId),
    client.from('favorite_staff').select('staff_id').eq('user_id', userId),
  ]);
  if (salons.error) throw salons.error;
  if (services.error) throw services.error;
  if (staff.error) throw staff.error;
  return {
    salonIds: (salons.data ?? []).map((r: any) => String(r.salon_id)),
    serviceIds: (services.data ?? []).map((r: any) => String(r.service_id)),
    staffIds: (staff.data ?? []).map((r: any) => String(r.staff_id)),
  };
}

type FavoriteKind = 'salon' | 'service' | 'staff';

const TABLE_BY_KIND: Record<FavoriteKind, string> = {
  salon: 'favorite_salons',
  service: 'favorite_services',
  staff: 'favorite_staff',
};
const COLUMN_BY_KIND: Record<FavoriteKind, string> = {
  salon: 'salon_id',
  service: 'service_id',
  staff: 'staff_id',
};

export async function setFavorite(
  client: SupabaseClient,
  userId: string,
  kind: FavoriteKind,
  itemId: string,
  favorite: boolean,
): Promise<void> {
  const table = TABLE_BY_KIND[kind];
  const column = COLUMN_BY_KIND[kind];
  if (favorite) {
    const { error } = await client
      .from(table)
      .upsert({ user_id: userId, [column]: itemId }, { onConflict: `user_id,${column}` });
    if (error) throw error;
  } else {
    const { error } = await client
      .from(table)
      .delete()
      .eq('user_id', userId)
      .eq(column, itemId);
    if (error) throw error;
  }
}

/** Realtime (task STEP 6): any favourites change on any device re-fires onChange. */
export function subscribeToFavorites(
  client: SupabaseClient,
  userId: string,
  onChange: () => void,
): () => void {
  const channel = client.channel(`nxu-favorites-${userId}`);
  for (const kind of ['salon', 'service', 'staff'] as FavoriteKind[]) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE_BY_KIND[kind],
        filter: `user_id=eq.${userId}`,
      },
      () => onChange(),
    );
  }
  channel.subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
