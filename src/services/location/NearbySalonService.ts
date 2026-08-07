/**
 * NearbySalonService — Calculates salon distances locally (Haversine) and ranks
 * No external API calls.
 */
import { Salon } from '../../types';
import { haversineMeters } from './DistanceCalculator';
import { sortSalons, groupSalons, SortedSalon, GroupedSalons } from './SalonSorter';
import Logger from './Logger';

export interface NearbyResult {
  salons: SortedSalon[];
  grouped: GroupedSalons;
  total: number;
}

let lastComputedLocation: { lat: number; lng: number } | null = null;
let lastResult: NearbyResult | null = null;

export function computeNearbySalons(
  salons: Salon[],
  userLat: number,
  userLng: number,
  opts?: { useCacheIfSameLocation?: boolean }
): NearbyResult {
  // Prevent unnecessary recalculation if same location (caller should enforce 100m threshold, but double-check)
  if (opts?.useCacheIfSameLocation && lastResult && lastComputedLocation) {
    const dist = haversineMeters(userLat, userLng, lastComputedLocation.lat, lastComputedLocation.lng);
    if (dist < 1 && lastResult.total === salons.length) {
      Logger.debug('Nearby recalculation skipped - same location');
      return lastResult;
    }
  }

  const computed: SortedSalon[] = [];
  for (const salon of salons) {
    // Salon must have lat/lng; if missing, distance is Infinity and goes to everythingElse
    let distM = Infinity;
    if (typeof salon.lat === 'number' && typeof salon.lng === 'number' && Number.isFinite(salon.lat) && Number.isFinite(salon.lng)) {
      distM = haversineMeters(userLat, userLng, salon.lat, salon.lng);
    }
    const distKm = distM === Infinity ? 999 : Math.round((distM / 1000) * 100) / 100;
    computed.push({
      ...salon,
      computedDistanceM: distM,
      computedDistanceKm: distKm,
    });
  }

  const sorted = sortSalons(computed);
  const grouped = groupSalons(sorted);

  const result: NearbyResult = { salons: sorted, grouped, total: salons.length };
  lastComputedLocation = { lat: userLat, lng: userLng };
  lastResult = result;

  Logger.info(`Computed distances for ${salons.length} salons`, { userLat, userLng });

  return result;
}

export function clearNearbyCache() {
  lastComputedLocation = null;
  lastResult = null;
}

export const NearbySalonService = { computeNearbySalons, clearNearbyCache };
export default NearbySalonService;
