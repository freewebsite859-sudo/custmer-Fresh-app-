/**
 * Live Geolocation Utility
 * Uses Browser Geolocation API (primary) + Google Geolocation API (fallback)
 * for real-time user location tracking.
 * Includes local Jaipur area detection from coordinates.
 */

const GOOGLE_GEOLOCATION_API_KEY = import.meta.env.VITE_GOOGLE_GEOLOCATION_API_KEY || 'AIzaSyA-Gcqz5-iQbqm0vPfk98ONrtAENUX3dTk';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  address?: string;
  city?: string;
  area?: string;
  timestamp: number;
}

/* ──────────────────────────────────────────────
 * LOCAL JAIPUR AREA DETECTION (no API needed)
 * Maps approximate coordinate ranges to known areas
 * ────────────────────────────────────────────── */
interface AreaBounds {
  name: string;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

const JAIPUR_AREAS: AreaBounds[] = [
  // Central Jaipur
  { name: 'Pink City / Johari Bazaar', latMin: 26.910, latMax: 26.930, lngMin: 75.815, lngMax: 75.835 },
  { name: 'MI Road', latMin: 26.905, latMax: 26.920, lngMin: 75.790, lngMax: 75.810 },
  { name: 'C-Scheme', latMin: 26.895, latMax: 26.915, lngMin: 75.785, lngMax: 75.810 },
  { name: 'Hawa Mahal Area', latMin: 26.920, latMax: 26.930, lngMin: 75.820, lngMax: 75.835 },

  // South Jaipur
  { name: 'Mansarovar', latMin: 26.845, latMax: 26.880, lngMin: 75.755, lngMax: 75.785 },
  { name: 'Malviya Nagar', latMin: 26.845, latMax: 26.875, lngMin: 75.785, lngMax: 75.820 },
  { name: 'Jagatpura', latMin: 26.810, latMax: 26.850, lngMin: 75.810, lngMax: 75.870 },
  { name: 'Sanganer', latMin: 26.800, latMax: 26.840, lngMin: 75.760, lngMax: 75.800 },
  { name: 'Pratap Nagar', latMin: 26.810, latMax: 26.845, lngMin: 75.770, lngMax: 75.810 },
  { name: 'Tonk Road', latMin: 26.850, latMax: 26.900, lngMin: 75.780, lngMax: 75.800 },
  { name: 'Durgapura', latMin: 26.840, latMax: 26.860, lngMin: 75.760, lngMax: 75.785 },
  { name: 'Jawahar Nagar', latMin: 26.860, latMax: 26.880, lngMin: 75.790, lngMax: 75.815 },

  // West Jaipur
  { name: 'Vaishali Nagar', latMin: 26.900, latMax: 26.930, lngMin: 75.720, lngMax: 75.755 },
  { name: 'Ajmer Road', latMin: 26.880, latMax: 26.920, lngMin: 75.710, lngMax: 75.745 },
  { name: 'Jhotwara', latMin: 26.920, latMax: 26.955, lngMin: 75.720, lngMax: 75.760 },
  { name: 'Nirman Nagar', latMin: 26.895, latMax: 26.915, lngMin: 75.740, lngMax: 75.765 },

  // North Jaipur
  { name: 'Raja Park', latMin: 26.890, latMax: 26.910, lngMin: 75.805, lngMax: 75.830 },
  { name: 'Adarsh Nagar', latMin: 26.900, latMax: 26.920, lngMin: 75.780, lngMax: 75.800 },
  { name: 'Civil Lines', latMin: 26.900, latMax: 26.920, lngMin: 75.780, lngMax: 75.810 },
  { name: 'Bani Park', latMin: 26.920, latMax: 26.945, lngMin: 75.775, lngMax: 75.800 },
  { name: 'Sindhi Camp', latMin: 26.915, latMax: 26.930, lngMin: 75.780, lngMax: 75.800 },

  // East Jaipur
  { name: 'Sitapura', latMin: 26.780, latMax: 26.820, lngMin: 75.810, lngMax: 75.870 },
  { name: 'Vidyadhar Nagar', latMin: 26.930, latMax: 26.960, lngMin: 75.760, lngMax: 75.800 },

  // Extended areas
  { name: 'Shyam Nagar', latMin: 26.895, latMax: 26.915, lngMin: 75.760, lngMax: 75.785 },
  { name: 'Gopalpura', latMin: 26.865, latMax: 26.885, lngMin: 75.760, lngMax: 75.790 },
  { name: 'Mansarovar Extension', latMin: 26.830, latMax: 26.855, lngMin: 75.740, lngMax: 75.770 },
  { name: 'Shipra Path', latMin: 26.855, latMax: 26.875, lngMin: 75.770, lngMax: 75.795 },
  { name: 'New Sanganer Road', latMin: 26.855, latMax: 26.880, lngMin: 75.755, lngMax: 75.775 },
];

/**
 * Detect Jaipur area from GPS coordinates (local, no API needed)
 */
function detectJaipurArea(lat: number, lng: number): string {
  for (const area of JAIPUR_AREAS) {
    if (lat >= area.latMin && lat <= area.latMax && lng >= area.lngMin && lng <= area.lngMax) {
      return area.name;
    }
  }
  // If no exact match, find closest area
  let closestArea = 'Jaipur';
  let minDist = Infinity;
  for (const area of JAIPUR_AREAS) {
    const centerLat = (area.latMin + area.latMax) / 2;
    const centerLng = (area.lngMin + area.lngMax) / 2;
    const dist = Math.sqrt((lat - centerLat) ** 2 + (lng - centerLng) ** 2);
    if (dist < minDist) {
      minDist = dist;
      closestArea = area.name;
    }
  }
  // Only return closest if reasonably near (within ~5km)
  return minDist < 0.05 ? `Near ${closestArea}` : 'Jaipur';
}

/* ──────────────────────────────────────────────
 * BROWSER GEOLOCATION
 * ────────────────────────────────────────────── */
export function isGeolocationAvailable(): boolean {
  return 'geolocation' in navigator;
}

export function getBrowserPosition(timeout = 20000): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationAvailable()) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('Location permission denied. Please enable location access in your browser settings.'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable. Trying alternative method...'));
            break;
          case error.TIMEOUT:
            reject(new Error('Location request timed out. Trying alternative method...'));
            break;
          default:
            reject(new Error('An unknown error occurred while getting location.'));
        }
      },
      {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 60000, // Accept cached position up to 60 seconds old
      }
    );
  });
}

/**
 * Watch position for real-time tracking
 */
export function watchPosition(
  onUpdate: (pos: GeoPosition) => void,
  onError: (err: Error) => void,
  options?: { highAccuracy?: boolean }
): () => void {
  if (!isGeolocationAvailable()) {
    onError(new Error('Geolocation is not supported'));
    return () => {};
  }

  const watchId = navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp,
      });
    },
    (error) => {
      switch (error.code) {
        case error.PERMISSION_DENIED:
          onError(new Error('Location permission denied'));
          break;
        case error.POSITION_UNAVAILABLE:
          onError(new Error('Location unavailable'));
          break;
        case error.TIMEOUT:
          onError(new Error('Location request timed out'));
          break;
        default:
          onError(new Error('Unknown location error'));
      }
    },
    {
      enableHighAccuracy: options?.highAccuracy ?? true,
      timeout: 20000,
      maximumAge: 15000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

/* ──────────────────────────────────────────────
 * GOOGLE GEOLOCATION API FALLBACK
 * ────────────────────────────────────────────── */
export async function getGoogleGeoPosition(): Promise<GeoPosition> {
  const response = await fetch(
    `https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_GEOLOCATION_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ considerIp: true }),
    }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => null);
    throw new Error(
      errData?.error?.message || `Google Geolocation API error: ${response.status}`
    );
  }

  const data = await response.json();
  return {
    lat: data.location.lat,
    lng: data.location.lng,
    accuracy: data.accuracy,
    timestamp: Date.now(),
  };
}

/* ──────────────────────────────────────────────
 * REVERSE GEOCODING (Google Maps API)
 * ────────────────────────────────────────────── */
export async function reverseGeocode(lat: number, lng: number): Promise<{
  address: string;
  city: string;
  area: string;
  formattedAddress: string;
} | null> {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_GEOLOCATION_API_KEY}`
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 'OK' || !data.results?.length) return null;

    const result = data.results[0];
    const components = result.address_components;

    // Extract city
    const cityComponent = components.find((c: any) =>
      c.types.includes('locality') || c.types.includes('administrative_area_level_2')
    );
    const city = cityComponent?.long_name || 'Jaipur';

    // Extract area/neighborhood - try multiple levels
    const areaComponent = components.find((c: any) =>
      c.types.includes('sublocality_level_1') ||
      c.types.includes('sublocality') ||
      c.types.includes('neighborhood')
    );
    const routeComponent = components.find((c: any) =>
      c.types.includes('route')
    );
    const area = areaComponent?.long_name || routeComponent?.long_name || '';

    // Extract postal code
    const postalComponent = components.find((c: any) =>
      c.types.includes('postal_code')
    );
    const pincode = postalComponent?.long_name || '';

    return {
      address: result.formatted_address,
      city,
      area: area || city,
      formattedAddress: result.formatted_address,
    };
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

/* ──────────────────────────────────────────────
 * DISTANCE CALCULATION (Haversine formula)
 * ────────────────────────────────────────────── */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/* ──────────────────────────────────────────────
 * MAIN: Get live location with all fallbacks
 * 1. Browser GPS (most accurate)
 * 2. Google Geolocation API (cell tower/Wi-Fi)
 * 3. Reverse geocode OR local area detection
 * ────────────────────────────────────────────── */
export async function getLiveLocation(): Promise<GeoPosition & { address?: string; city?: string; area?: string }> {
  let position: GeoPosition;

  try {
    // Primary: Browser GPS
    position = await getBrowserPosition();
  } catch (browserError) {
    console.warn('Browser geolocation failed, trying Google API fallback:', browserError);
    try {
      // Fallback: Google Geolocation API
      position = await getGoogleGeoPosition();
    } catch (googleError) {
      console.error('Google geolocation also failed:', googleError);
      throw new Error('Unable to determine your location. Please check your internet connection and location permissions.');
    }
  }

  // Try reverse geocoding first
  let area = '';
  let city = 'Jaipur';
  let address = '';

  try {
    const geoResult = await reverseGeocode(position.lat, position.lng);
    if (geoResult) {
      area = geoResult.area;
      city = geoResult.city;
      address = geoResult.formattedAddress;
    }
  } catch (e) {
    console.warn('Reverse geocoding failed, using local detection');
  }

  // If reverse geocoding failed or returned generic result, use local detection
  if (!area || area === city || area.length < 3) {
    area = detectJaipurArea(position.lat, position.lng);
  }

  // Format address if not available
  if (!address) {
    address = `${area}, ${city} (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})`;
  }

  return {
    ...position,
    address,
    city,
    area,
  };
}
