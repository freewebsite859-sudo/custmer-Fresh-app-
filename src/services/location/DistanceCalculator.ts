/**
 * DistanceCalculator — Computes distances using Haversine Formula.
 * Earth Radius = 6371 km (6,371,000 meters).
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Calculates great-circle distance between two GPS coordinates in kilometers.
 * 
 * @param lat1 User Latitude
 * @param lon1 User Longitude
 * @param lat2 Destination Latitude
 * @param lon2 Destination Longitude
 * @returns Distance in kilometers
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lon2)
  ) {
    return Infinity;
  }

  // Same point
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculates distance in meters.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) * 1000;
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Formats a distance in kilometers into a clean display string (e.g., "850 m" or "2.4 km").
 */
export function formatDistance(distanceKm: number): string {
  if (!Number.isFinite(distanceKm) || distanceKm < 0 || distanceKm === Infinity) {
    return '';
  }
  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000);
    return `${meters} m`;
  }
  return `${distanceKm.toFixed(1)} km`;
}

/**
 * Helper to enrich and sort an array of location-bearing objects by distance to user coordinates.
 * Nearest items appear first.
 */
export function sortNearby<T extends { lat?: number; lng?: number; distanceKm?: number }>(
  items: T[],
  userLat: number,
  userLng: number
): Array<T & { distanceKm: number; formattedDistance: string }> {
  return items
    .map((item) => {
      const itemLat = item.lat ?? 0;
      const itemLng = item.lng ?? 0;
      const hasCoords = Number.isFinite(itemLat) && Number.isFinite(itemLng) && !(itemLat === 0 && itemLng === 0);
      const distance = hasCoords
        ? calculateHaversineDistanceKm(userLat, userLng, itemLat, itemLng)
        : (item.distanceKm && item.distanceKm > 0 ? item.distanceKm : 999);

      return {
        ...item,
        distanceKm: Math.round(distance * 100) / 100,
        formattedDistance: formatDistance(distance),
      };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
