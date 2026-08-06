/**
 * Live Geolocation Utility
 * Uses Browser Geolocation API (primary) + Google Geolocation API (fallback)
 * for real-time user location tracking.
 * Includes DETAILED Jaipur area detection from coordinates (50+ areas).
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
 * DETAILED JAIPUR AREA DETECTION (50+ areas)
 * Maps precise coordinate ranges to known localities
 * Sorted by specificity (smaller areas first for better matching)
 * ────────────────────────────────────────────── */
interface AreaBounds {
  name: string;
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
  pincode?: string;
}

const JAIPUR_AREAS: AreaBounds[] = [
  // ═══ NORTH-WEST JAIPUR (Jhotwara side) ═══
  { name: 'Nangal Jaisabohra', latMin: 26.965, latMax: 26.985, lngMin: 75.710, lngMax: 75.740, pincode: '302012' },
  { name: 'Murlipura', latMin: 26.960, latMax: 26.975, lngMin: 75.750, lngMax: 75.770, pincode: '302039' },
  { name: 'Niwaru Road', latMin: 26.945, latMax: 26.965, lngMin: 75.715, lngMax: 75.740, pincode: '302012' },
  { name: 'Jhotwara', latMin: 26.935, latMax: 26.960, lngMin: 75.720, lngMax: 75.755, pincode: '302012' },
  { name: 'Kalwar Road', latMin: 26.940, latMax: 26.970, lngMin: 75.725, lngMax: 75.745, pincode: '302012' },
  { name: 'Harnathapura', latMin: 26.950, latMax: 26.965, lngMin: 75.730, lngMax: 75.750 },
  { name: 'Bindayaka', latMin: 26.940, latMax: 26.960, lngMin: 75.705, lngMax: 75.730, pincode: '302012' },
  { name: 'Khora Bisal', latMin: 26.955, latMax: 26.970, lngMin: 75.700, lngMax: 75.720 },
  { name: 'Dhankya', latMin: 26.950, latMax: 26.970, lngMin: 75.690, lngMax: 75.715 },
  { name: 'Meena Wala', latMin: 26.960, latMax: 26.980, lngMin: 75.730, lngMax: 75.755 },
  { name: 'Sikar Road', latMin: 26.975, latMax: 26.995, lngMin: 75.730, lngMax: 75.750 },
  { name: 'Nadi Ka Phatak', latMin: 26.975, latMax: 26.990, lngMin: 75.735, lngMax: 75.755 },
  { name: 'Vidyadhar Nagar', latMin: 26.945, latMax: 26.970, lngMin: 75.755, lngMax: 75.790, pincode: '302039' },
  { name: 'Ambabari', latMin: 26.935, latMax: 26.950, lngMin: 75.760, lngMax: 75.780 },
  { name: 'Shastri Nagar', latMin: 26.930, latMax: 26.950, lngMin: 75.770, lngMax: 75.795 },

  // ═══ CENTRAL-NORTH JAIPUR ═══
  { name: 'Bani Park', latMin: 26.925, latMax: 26.945, lngMin: 75.775, lngMax: 75.800, pincode: '302016' },
  { name: 'Sindhi Camp', latMin: 26.920, latMax: 26.935, lngMin: 75.780, lngMax: 75.800 },
  { name: 'Station Road', latMin: 26.915, latMax: 26.930, lngMin: 75.780, lngMax: 75.795 },
  { name: 'Hawa Mahal Area', latMin: 26.920, latMax: 26.935, lngMin: 75.820, lngMax: 75.840 },
  { name: 'Pink City', latMin: 26.915, latMax: 26.935, lngMin: 75.815, lngMax: 75.840, pincode: '302002' },
  { name: 'Johari Bazaar', latMin: 26.918, latMax: 26.928, lngMin: 75.818, lngMax: 75.832 },
  { name: 'Bapu Bazaar', latMin: 26.912, latMax: 26.925, lngMin: 75.810, lngMax: 75.828 },

  // ═══ CENTRAL JAIPUR ═══
  { name: 'MI Road', latMin: 26.910, latMax: 26.925, lngMin: 75.790, lngMax: 75.815 },
  { name: 'C-Scheme', latMin: 26.900, latMax: 26.918, lngMin: 75.785, lngMax: 75.810, pincode: '302001' },
  { name: 'Civil Lines', latMin: 26.905, latMax: 26.925, lngMin: 75.785, lngMax: 75.810, pincode: '302006' },
  { name: 'Adarsh Nagar', latMin: 26.905, latMax: 26.920, lngMin: 75.775, lngMax: 75.800, pincode: '302004' },
  { name: 'Raja Park', latMin: 26.895, latMax: 26.910, lngMin: 75.805, lngMax: 75.830, pincode: '302004' },
  { name: 'Tilak Nagar', latMin: 26.890, latMax: 26.905, lngMin: 75.795, lngMax: 75.815 },
  { name: 'Jawahar Nagar', latMin: 26.875, latMax: 26.895, lngMin: 75.795, lngMax: 75.820, pincode: '302004' },

  // ═══ WEST JAIPUR ═══
  { name: 'Vaishali Nagar', latMin: 26.910, latMax: 26.935, lngMin: 75.725, lngMax: 75.760, pincode: '302021' },
  { name: 'Nirman Nagar', latMin: 26.900, latMax: 26.918, lngMin: 75.740, lngMax: 75.765 },
  { name: 'Shyam Nagar', latMin: 26.898, latMax: 26.915, lngMin: 75.760, lngMax: 75.785 },
  { name: 'Ajmer Road', latMin: 26.885, latMax: 26.920, lngMin: 75.710, lngMax: 75.740, pincode: '302001' },
  { name: 'Hathroi', latMin: 26.900, latMax: 26.915, lngMin: 75.780, lngMax: 75.800 },

  // ═══ SOUTH-WEST JAIPUR ═══
  { name: 'Mansarovar', latMin: 26.850, latMax: 26.880, lngMin: 75.755, lngMax: 75.790, pincode: '302020' },
  { name: 'Mansarovar Extension', latMin: 26.835, latMax: 26.860, lngMin: 75.740, lngMax: 75.770 },
  { name: 'Shipra Path', latMin: 26.858, latMax: 26.875, lngMin: 75.770, lngMax: 75.795 },
  { name: 'New Sanganer Road', latMin: 26.860, latMax: 26.880, lngMin: 75.755, lngMax: 75.775 },
  { name: 'Gopalpura', latMin: 26.870, latMax: 26.890, lngMin: 75.760, lngMax: 75.790 },
  { name: 'Gopalpura Bypass', latMin: 26.865, latMax: 26.885, lngMin: 75.750, lngMax: 75.775 },
  { name: 'Durgapura', latMin: 26.845, latMax: 26.865, lngMin: 75.760, lngMax: 75.785, pincode: '302018' },
  { name: 'Tonk Road', latMin: 26.855, latMax: 26.905, lngMin: 75.780, lngMax: 75.800, pincode: '302015' },
  { name: 'Lal Kothi', latMin: 26.885, latMax: 26.900, lngMin: 75.780, lngMax: 75.800 },

  // ═══ SOUTH JAIPUR ═══
  { name: 'Malviya Nagar', latMin: 26.850, latMax: 26.875, lngMin: 75.790, lngMax: 75.825, pincode: '302017' },
  { name: 'Jawahar Circle', latMin: 26.845, latMax: 26.860, lngMin: 75.795, lngMax: 75.815 },
  { name: 'Jagatpura', latMin: 26.815, latMax: 26.855, lngMin: 75.815, lngMax: 75.870, pincode: '302017' },
  { name: 'Pratap Nagar', latMin: 26.815, latMax: 26.845, lngMin: 75.775, lngMax: 75.815, pincode: '302033' },
  { name: 'Sanganer', latMin: 26.805, latMax: 26.840, lngMin: 75.765, lngMax: 75.800, pincode: '302029' },
  { name: 'Sitapura', latMin: 26.780, latMax: 26.820, lngMin: 75.815, lngMax: 75.870, pincode: '302022' },
  { name: 'RIICO Industrial Area', latMin: 26.790, latMax: 26.820, lngMin: 75.800, lngMax: 75.840 },
  { name: 'VT Road', latMin: 26.840, latMax: 26.860, lngMin: 75.780, lngMax: 75.800 },

  // ═══ EAST JAIPUR ═══
  { name: 'Amer Road', latMin: 26.920, latMax: 26.950, lngMin: 75.830, lngMax: 75.870 },
  { name: 'Galta Gate', latMin: 26.910, latMax: 26.930, lngMin: 75.830, lngMax: 75.855 },
  { name: 'Ramganj', latMin: 26.905, latMax: 26.925, lngMin: 75.825, lngMax: 75.850 },
  { name: 'Sanganeri Gate', latMin: 26.900, latMax: 26.920, lngMin: 75.820, lngMax: 75.840 },

  // ═══ NORTH JAIPUR ═══
  { name: 'Kukas', latMin: 26.980, latMax: 27.020, lngMin: 75.840, lngMax: 75.880 },
  { name: 'Amer', latMin: 26.980, latMax: 27.010, lngMin: 75.850, lngMax: 75.880 },
];

/**
 * Detect Jaipur area from GPS coordinates (local, no API needed)
 * Uses precise coordinate matching with specificity priority
 */
function detectJaipurArea(lat: number, lng: number): string {
  // First pass: find exact match (most specific area)
  for (const area of JAIPUR_AREAS) {
    if (lat >= area.latMin && lat <= area.latMax && lng >= area.lngMin && lng <= area.lngMax) {
      return area.name;
    }
  }

  // Second pass: find closest area center within reasonable distance
  let closestArea = 'Jaipur';
  let minDist = Infinity;

  for (const area of JAIPUR_AREAS) {
    const centerLat = (area.latMin + area.latMax) / 2;
    const centerLng = (area.lngMin + area.lngMax) / 2;
    const dist = Math.sqrt(
      Math.pow((lat - centerLat) * 111, 2) +  // 1 degree lat ≈ 111 km
      Math.pow((lng - centerLng) * 111 * Math.cos(lat * Math.PI / 180), 2)
    );
    if (dist < minDist) {
      minDist = dist;
      closestArea = area.name;
    }
  }

  // Return closest area if within ~3km, otherwise generic Jaipur
  if (minDist < 3) {
    return closestArea;
  } else if (minDist < 8) {
    return `Near ${closestArea}`;
  }
  return 'Jaipur';
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
        maximumAge: 60000,
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

    // Extract area - try multiple levels for best accuracy
    const sublocality2 = components.find((c: any) => c.types.includes('sublocality_level_2'));
    const sublocality1 = components.find((c: any) => c.types.includes('sublocality_level_1'));
    const sublocality = components.find((c: any) => c.types.includes('sublocality'));
    const neighborhood = components.find((c: any) => c.types.includes('neighborhood'));
    const route = components.find((c: any) => c.types.includes('route'));

    const area = sublocality2?.long_name || sublocality1?.long_name || sublocality?.long_name || neighborhood?.long_name || route?.long_name || '';

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
 * 3. Reverse geocode (Google Maps) → fallback to local detection
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

  // Try BOTH methods in parallel for best accuracy
  let area = '';
  let city = 'Jaipur';
  let address = '';

  // 1. Try Google reverse geocoding
  try {
    const geoResult = await reverseGeocode(position.lat, position.lng);
    if (geoResult && geoResult.area && geoResult.area !== geoResult.city) {
      area = geoResult.area;
      city = geoResult.city;
      address = geoResult.formattedAddress;
    }
  } catch (e) {
    console.warn('Reverse geocoding failed, using local detection');
  }

  // 2. Always run local detection as well (for better Jaipur-specific accuracy)
  const localArea = detectJaipurArea(position.lat, position.lng);

  // 3. Prefer local detection if it's more specific (not generic "Jaipur" or "Near ...")
  if (!area || area === city || area.length < 3) {
    area = localArea;
  } else if (localArea && !localArea.startsWith('Near') && localArea !== 'Jaipur') {
    // If local detection gives a specific area, prefer it over generic API result
    area = localArea;
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
