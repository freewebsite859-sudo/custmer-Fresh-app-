// Live salon discovery data layer (Phase 1 – Step 2).
// Reads ONLY existing anon-readable tables: salons, services, salon_public_websites.
// No new DB objects. Maps DB rows onto the existing UI `Salon` type.
// Fields with no real source yet (rating/review counts/distance) are returned
// as 0 + isNew=true so the UI can show a "New" tag and hide fake badges (D2-approved).
// Coordinates are resolved from GeoJSON area centroids when available.

import type { SupabaseClient } from '@supabase/supabase-js';
import { Salon, Service, Staff } from '../types';
import { BANNER_URL } from '../data/mockData';
import GeoService from '../services/geoService';

const FETCH_LIMIT = 50;

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
      .select('id, slug, name, description, business_category, gender_category, phone, address, area, city, state')
      // Approved/published only — never drafts: owner-approved (verified),
      // active, not soft-deleted.
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
    // Only published public sites count as "live" shops.
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

  // A shop is listed only when it has a published public website row too
  // (owner approved + published = live). Drafts are never shown.
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

    return {
      id: row.id,
      name: row.name || 'Salon',
      type: category,
      category,
      area: row.area || '',
      city: row.city || '',
      distanceKm: 0, // no geo source yet — UI hides the distance badge for 0
      rating: 0, // no ratings source yet — UI shows "New" instead of a fake score
      reviewCount: 0,
      reviewsCount: 0,
      verified: true, // filtered above: verified + active + published site only
      isNew: true, // every live salon is new until a real ratings source exists
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
    } satisfies Salon;
  });

  // Resolve coordinates from GeoJSON area centroids (no API)
  try {
    const citySlugs = new Set(mappedSalons.map(s => (s.city || 'jaipur').toLowerCase().trim()));
    for (const slug of citySlugs) {
      try { await GeoService.loadCity(slug); } catch {}
    }
    for (const salon of mappedSalons) {
      if (salon.lat && salon.lng) continue;
      const citySlug = (salon.city || 'jaipur').toLowerCase().trim();
      const geo = GeoService.get(citySlug);
      if (!geo) continue;
      const feature = geo.findByName(salon.area);
      if (feature) {
        const ring = feature.geometry.coordinates[0];
        let sumLng = 0, sumLat = 0;
        for (const [lng, lat] of ring) { sumLng += lng; sumLat += lat; }
        salon.lng = sumLng / ring.length;
        salon.lat = sumLat / ring.length;
      }
    }
  } catch {
    // GeoJSON resolution is best-effort
  }

  return mappedSalons;
}
