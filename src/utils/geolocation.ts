/**
 * Live Geolocation Utility
 * Uses Browser Geolocation API (primary) + Google Geolocation API (fallback)
 * for real-time user location tracking.
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

/**
 * Check if browser geolocation is available
 */
export function isGeolocationAvailable(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Get current position using Browser Geolocation API (GPS/Wi-Fi/Cell)
 * This is the PRIMARY method - uses device GPS for accurate location
 */
export function getBrowserPosition(timeout = 15000): Promise<GeoPosition> {
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
        maximumAge: 30000, // Accept cached position up to 30 seconds old
      }
    );
  });
}

/**
 * Watch position for real-time tracking (live movement)
 * Returns a cleanup function to stop watching
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
      timeout: 15000,
      maximumAge: 10000,
    }
  );

  return () => {
    navigator.geolocation.clearWatch(watchId);
  };
}

/**
 * Fallback: Get approximate location using Google Geolocation API
 * Uses cell towers and Wi-Fi nodes when GPS is unavailable
 */
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

/**
 * Reverse geocode lat/lng to human-readable address using Google Maps Geocoding API
 */
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

    // Extract area/neighborhood
    const areaComponent = components.find((c: any) =>
      c.types.includes('sublocality_level_1') ||
      c.types.includes('sublocality') ||
      c.types.includes('neighborhood') ||
      c.types.includes('route')
    );
    const area = areaComponent?.long_name || '';

    // Extract postal code
    const postalComponent = components.find((c: any) =>
      c.types.includes('postal_code')
    );

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

/**
 * Calculate distance between two coordinates using Haversine formula (in km)
 */
export function calculateDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Main function: Get live location with automatic fallback
 * 1. Try Browser GPS (most accurate)
 * 2. Fallback to Google Geolocation API (cell tower/Wi-Fi)
 * 3. Returns position with reverse-geocoded address
 */
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

  // Reverse geocode to get address
  const geoResult = await reverseGeocode(position.lat, position.lng);

  return {
    ...position,
    address: geoResult?.formattedAddress || `${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`,
    city: geoResult?.city || 'Jaipur',
    area: geoResult?.area || 'Unknown Area',
  };
}
