// Live salon discovery data layer
// Reads ONLY existing anon-readable tables: salons, services, salon_public_websites.
// No new DB objects. Maps DB rows onto the existing UI `Salon` type.

import type { SupabaseClient } from '@supabase/supabase-js';
import { Salon, Service, Staff } from '../types';
import { BANNER_URL } from '../data/mockData';

const FETCH_LIMIT = 50;

const AREA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'vaishali nagar': { lat: 26.9030, lng: 75.7423 },
  'c-scheme': { lat: 26.9110, lng: 75.8030 },
  'civil lines': { lat: 26.9060, lng: 75.7870 },
  'bani park': { lat: 26.9290, lng: 75.7950 },
  'malviya nagar': { lat: 26.8530, lng: 75.8170 },
  'mansarovar': { lat: 26.8550, lng: 75.7660 },
  'raja park': { lat: 26.8980, lng: 75.8310 },
  'jhotwara': { lat: 26.9450, lng: 75.7580 },
  'tonk road': { lat: 26.8750, lng: 75.7950 },
  'jagatpura': { lat: 26.8220, lng: 75.8640 },
  'pratap nagar': { lat: 26.8040, lng: 75.8150 },
  'vidhyadhar nagar': { lat: 26.9600, lng: 75.7820 },
  'sanganer': { lat: 26.8180, lng: 75.7720 },
  'shyam nagar': { lat: 26.8920, lng: 75.7660 },
  'gopalpura': { lat: 26.8740, lng: 75.7830 },
  'pink city': { lat: 26.9220, lng: 75.8270 },
  'bapu nagar': { lat: 26.8920, lng: 75.8140 },
};

interface SalonRow {
  id: string;
  slug: string | null;
  name: string | null;
  description: string | null;
  business_category: string | null;
  gender_category: string | null;
  phone: string | null;
  address: string | null;
  area: string | null;
  city: string | null;
  state: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface ServiceRow {
  id: string;
  salon_id: string;
  name: string | null;
  description: string | null;
  duration_minutes: number | null;
  price_paise: number | null;
}

interface PublicSiteRow {
  salon_id: string;
  config: any;
}

const toGenderCategory = (
  raw: string | null,
): Salon['genderCategory'] => {
  const v = (raw || '').toLowerCase();
  if (v.includes('unisex')) return 'Unisex';
  if (v.includes('women') || v.includes('female') || v.includes('ladies')) return 'Women Only';
  if (v.includes('men') || v.includes('male') || v.includes('gents')) return 'Men Only';
  return undefined;
};

const formatTime = (hhmm: string): string => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm || '');
  if (!m) return hhmm || '';
  let h = parseInt(m[1], 10);
  const suffix = h >= 12 ? 'PM' : 'AM';
  h = h % 12 === 0 ? 12 : h % 12;
  return `${h}:${m[2]} ${suffix}`;
};

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.length > 0) : [];

const mapService = (row: ServiceRow): Service => ({
  id: row.id,
  name: row.name || 'Service',
  durationMinutes: row.duration_minutes ?? 30,
  price: (row.price_paise ?? 0) / 100,
  category: 'Salon',
  description: row.description || undefined,
});

const mapStaff = (value: unknown, index: number): Staff => {
  const v = (value || {}) as Record<string, unknown>;
  return {
    id: typeof v.id === 'string' && v.id ? v.id : `staff-${index}`,
    name: typeof v.name === 'string' && v.name ? v.name : 'Professional',
    role: typeof v.role === 'string' && v.role ? v.role : 'Stylist',
    rating: typeof v.rating === 'number' ? v.rating : 0,
    reviewsCount: typeof v.reviewsCount === 'number' ? v.reviewsCount : 0,
    avatar: typeof v.avatar === 'string' ? v.avatar : '',
  };
};

const mapOffers = (value: unknown): Salon['offers'] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw, i) => {
      const v = (raw || {}) as Record<string, unknown>;
      const title = typeof v.title === 'string' ? v.title : '';
      const code = typeof v.code === 'string' ? v.code : '';
      if (!title || !code) return null;
      return {
        id: typeof v.id === 'string' && v.id ? v.id : `offer-${i}`,
        title,
        code,
        discountPercent: typeof v.discountPercent === 'number' ? v.discountPercent : undefined,
        amountOff: typeof v.amountOff === 'number' ? v.amountOff : undefined,
      };
    })
    .filter((o): o is NonNullable<typeof o> => o !== null);
};

export async function fetchPublicSalons(client: SupabaseClient): Promise<Salon[]> {
  const [salonsRes, servicesRes, sitesRes] = await Promise.all([
    client
      .from('salons')
      .select('id, slug, name, description, business_category, gender_category, phone, address, area, city, state, latitude, longitude')
      .eq('verified', true)
      .eq('is_active', true)
      .is('deleted_at', null)
      .limit(FETCH_LIMIT),
    client
      .from('services')
      .select('id, salon_id, name, description, duration_minutes, price_paise')
      .eq('is_active', true)
      .eq('is_bookable_online', true)
      .is('deleted_at', null),
    client
      .from('salon_public_websites')
      .select('salon_id, config')
      .eq('is_published', true),
  ]);

  if (salonsRes.error) throw salonsRes.error;
  if (servicesRes.error) throw servicesRes.error;
  if (sitesRes.error) throw sitesRes.error;

  const servicesBySalon = new Map<string, Service[]>();
  for (const row of (servicesRes.data || []) as ServiceRow[]) {
    const list = servicesBySalon.get(row.salon_id) || [];
    list.push(mapService(row));
    servicesBySalon.set(row.salon_id, list);
  }

  const siteBySalon = new Map<string, any>();
  for (const row of (sitesRes.data || []) as PublicSiteRow[]) {
    siteBySalon.set(row.salon_id, row.config || {});
  }

  const publishedSiteIds = new Set(siteBySalon.keys());

  const mappedSalons = ((salonsRes.data || []) as SalonRow[])
    .filter((row) => publishedSiteIds.has(row.id))
    .map((row) => {
    const cfg = siteBySalon.get(row.id) || {};
    const profile = (cfg.profile || {}) as Record<string, unknown>;
    const services = servicesBySalon.get(row.id) || [];
    const photos = stringArray(cfg.photos);
    const staff = Array.isArray(cfg.staff) ? (cfg.staff as unknown[]).map(mapStaff) : [];
    const hours =
      profile.opening_hours &&
      typeof (profile.opening_hours as any).opens === 'string' &&
      typeof (profile.opening_hours as any).closes === 'string'
        ? `${formatTime((profile.opening_hours as any).opens)} – ${formatTime((profile.opening_hours as any).closes)}`
        : '';
    const image =
      (typeof profile.cover_url === 'string' && profile.cover_url) ||
      (typeof profile.logo_url === 'string' && profile.logo_url) ||
      photos[0] ||
      BANNER_URL;
    const prices = services.map((s) => s.price).filter((p) => p > 0);
    const category = row.business_category || 'Salon';

    const areaKey = (row.area || '').toLowerCase().trim();
    const fallbackCoord = AREA_COORDINATES[areaKey] || { lat: 26.9124, lng: 75.7873 };
    const lat = typeof row.latitude === 'number' && Number.isFinite(row.latitude) ? row.latitude : fallbackCoord.lat;
    const lng = typeof row.longitude === 'number' && Number.isFinite(row.longitude) ? row.longitude : fallbackCoord.lng;

    return {
      id: row.id,
      name: row.name || 'Salon',
      type: category,
      category,
      area: row.area || 'Jaipur',
      city: row.city || 'Jaipur',
      lat,
      lng,
      distanceKm: 0,
      rating: 0,
      reviewCount: 0,
      reviewsCount: 0,
      verified: true,
      isNew: true,
      image,
      gallery: photos.length > 0 ? photos : [image],
      startingPrice: prices.length > 0 ? Math.min(...prices) : 0,
      tags: [row.business_category, toGenderCategory(row.gender_category)].filter(
        (t): t is string => !!t,
      ),
      genderCategory: toGenderCategory(row.gender_category),
      address: row.address || '',
      hours,
      description: row.description || '',
      phone: row.phone || undefined,
      bookingUrl: undefined,
      amenities: [],
      offers: mapOffers(cfg.offers),
      services,
      staff,
    } as Salon;
  });

  return mappedSalons;
}
