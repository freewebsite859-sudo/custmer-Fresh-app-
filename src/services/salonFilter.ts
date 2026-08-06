/**
 * SALON FILTER SERVICE
 * 
 * After area detection → automatically filter salons by:
 *   Priority: Same Area → Nearest Distance → Highest Rating → Featured
 * 
 * Radius options: 2km, 5km, 10km
 * 100% client-side. No API.
 */

import { Salon } from '../types';
import GeoService from './geoService';

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

export interface FilteredSalon extends Salon {
  computedDistanceKm: number;   // calculated from GPS
  isSameArea: boolean;          // matches detected area
  sortScore: number;            // combined priority score
}

export type RadiusOption = 2 | 5 | 10;

export interface FilterResult {
  salons: FilteredSalon[];
  total: number;
  inSameArea: number;
  withinRadius: number;
  outsideRadius: number;
}

// ═══════════════════════════════════════
// HAVERSINE DISTANCE
// ═══════════════════════════════════════

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ═══════════════════════════════════════
// AREA → COORDINATES CACHE
// ═══════════════════════════════════════

const areaCoordCache = new Map<string, [number, number]>();

/**
 * Get coordinates for a salon by matching its area name to GeoJSON features.
 * Returns [lng, lat] centroid or null if no match.
 */
async function getSalonCoords(salon: Salon): Promise<[number, number] | null> {
  const cacheKey = salon.area.toLowerCase().trim();
  if (areaCoordCache.has(cacheKey)) return areaCoordCache.get(cacheKey)!;

  // Try to load city GeoJSON
  const citySlug = (salon.city || 'jaipur').toLowerCase().trim();
  try {
    const geo = await GeoService.loadCity(citySlug);
    const feature = geo.findByName(salon.area);
    if (feature) {
      const ring = feature.geometry.coordinates[0];
      let sumLng = 0, sumLat = 0;
      for (const [lng, lat] of ring) { sumLng += lng; sumLat += lat; }
      const centroid: [number, number] = [sumLng / ring.length, sumLat / ring.length];
      areaCoordCache.set(cacheKey, centroid);
      return centroid;
    }
  } catch {
    // GeoJSON not available for this city
  }

  // Fallback: check all loaded cities
  for (const city of GeoService.loadedCities()) {
    const geo = GeoService.get(city);
    if (!geo) continue;
    const feature = geo.findByName(salon.area);
    if (feature) {
      const ring = feature.geometry.coordinates[0];
      let sumLng = 0, sumLat = 0;
      for (const [lng, lat] of ring) { sumLng += lng; sumLat += lat; }
      const centroid: [number, number] = [sumLng / ring.length, sumLat / ring.length];
      areaCoordCache.set(cacheKey, centroid);
      return centroid;
    }
  }

  return null;
}

// ═══════════════════════════════════════
// MAIN FILTER FUNCTION
// ═══════════════════════════════════════

/**
 * Filter and sort salons based on user's GPS location and detected area.
 * 
 * Priority order:
 *   1. Same Area (exact area match)
 *   2. Nearest Distance (km)
 *   3. Highest Rating
 *   4. Featured (verified, has offers)
 * 
 * @param salons        All available salons
 * @param userLat       User's GPS latitude
 * @param userLng       User's GPS longitude
 * @param detectedArea  Area name from PIP detection
 * @param radiusKm      Filter radius (2, 5, or 10 km)
 * @param citySlug      City for GeoJSON lookup (default "jaipur")
 */
export async function filterSalons(
  salons: Salon[],
  userLat: number,
  userLng: number,
  detectedArea: string,
  radiusKm: RadiusOption = 10,
  citySlug = 'jaipur'
): Promise<FilterResult> {
  // Ensure GeoJSON is loaded
  try { await GeoService.loadCity(citySlug); } catch {}

  // Process all salons in parallel
  const processed: FilteredSalon[] = [];

  for (const salon of salons) {
    let distance = 0;
    let isSameArea = false;

    // Check if same area
    const normalizedName = salon.area.toLowerCase().trim();
    const normalizedDetected = detectedArea.toLowerCase().trim();
    isSameArea = normalizedName === normalizedDetected ||
                 normalizedName.includes(normalizedDetected) ||
                 normalizedDetected.includes(normalizedName);

    // Calculate distance using salon lat/lng or area centroid
    if (salon.lat && salon.lng) {
      distance = haversine(userLat, userLng, salon.lat, salon.lng);
    } else {
      const coords = await getSalonCoords(salon);
      if (coords) {
        distance = haversine(userLat, userLng, coords[1], coords[0]);
        // Store for future use
        salon.lat = coords[1];
        salon.lng = coords[0];
      } else {
        // No coordinates available — use existing distanceKm or large number
        distance = salon.distanceKm || 999;
      }
    }

    // Calculate sort score (lower = higher priority)
    // Priority: Same Area (0-100) → Distance (100-200) → Rating (200-300) → Featured (300-400)
    let sortScore = 0;

    // 1. Same Area: 0 if match, 100 if not
    sortScore += isSameArea ? 0 : 100;

    // 2. Distance: 0-99 based on distance (closer = lower)
    sortScore += Math.min(distance, 99);

    // 3. Rating: 0-99 inverse (higher rating = lower score)
    sortScore += (5 - Math.min(salon.rating || 0, 5)) * 20;

    // 4. Featured: 0 if verified/has offers, 50 if not
    sortScore += salon.verified && (salon.offers?.length ?? 0) > 0 ? 0 : 50;

    processed.push({
      ...salon,
      computedDistanceKm: Math.round(distance * 100) / 100,
      isSameArea,
      sortScore,
    });
  }

  // Sort by score (ascending — lower = better)
  processed.sort((a, b) => a.sortScore - b.sortScore);

  // Filter by radius
  const withinRadius = processed.filter(s => s.computedDistanceKm <= radiusKm);
  const outsideRadius = processed.filter(s => s.computedDistanceKm > radiusKm);

  return {
    salons: withinRadius,
    total: processed.length,
    inSameArea: processed.filter(s => s.isSameArea).length,
    withinRadius: withinRadius.length,
    outsideRadius: outsideRadius.length,
  };
}

// ═══════════════════════════════════════
// CONVENIENCE: Quick filter (sync, no GPS)
// ═══════════════════════════════════════

/**
 * Quick filter without GPS — just area name matching + rating sort.
 * Use when user hasn't granted location permission.
 */
export function quickFilter(
  salons: Salon[],
  detectedArea: string,
  maxResults = 20
): Salon[] {
  const normalized = detectedArea.toLowerCase().trim();

  return salons
    .map(salon => {
      const sameArea = salon.area.toLowerCase().includes(normalized) ||
                       normalized.includes(salon.area.toLowerCase());
      return { ...salon, _sameArea: sameArea ? 0 : 1 };
    })
    .sort((a, b) => {
      // Same area first
      if (a._sameArea !== b._sameArea) return a._sameArea - b._sameArea;
      // Then rating
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
      // Then verified
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      return 0;
    })
    .slice(0, maxResults)
    .map(({ _sameArea, ...salon }) => salon);
}
