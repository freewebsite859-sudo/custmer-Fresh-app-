/**
 * Live Geolocation Utility
 * Uses Browser Geolocation API (primary) + Google Geolocation API (fallback)
 * for real-time user location tracking.
 * 
 * AREA DETECTION: Uses offline Point-in-Polygon with Jaipur GeoJSON dataset
 * - 60+ Jaipur localities with polygon boundaries
 * - No API needed for area detection
 * - Works offline
 */

import { detectArea, getAreasWithinRadius, DetectedArea } from './pointInPolygon';

const GOOGLE_GEOLOCATION_API_KEY = import.meta.env.VITE_GOOGLE_GEOLOCATION_API_KEY || 'AIzaSyA-Gcqz5-iQbqm0vPfk98ONrtAENUX3dTk';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  address?: string;
  city?: string;
  area?: string;
  zone?: string;
  pincode?: string;
  confidence?: string;
  nearbyAreas?: DetectedArea[];
  timestamp: number;
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
 * REVERSE GEOCODING (Google Maps API) - OPTIONAL
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

    const cityComponent = components.find((c: any) =>
      c.types.includes('locality') || c.types.includes('administrative_area_level_2')
    );
    const city = cityComponent?.long_name || 'Jaipur';

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
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/* ──────────────────────────────────────────────
 * MAIN: Get live location with Point-in-Polygon
 * 1. Browser GPS (most accurate)
 * 2. Google Geolocation API (fallback)
 * 3. Offline Point-in-Polygon area detection
 * ────────────────────────────────────────────── */
export async function getLiveLocation(): Promise<GeoPosition & {
  address?: string;
  city?: string;
  area?: string;
  zone?: string;
  pincode?: string;
  confidence?: string;
  nearbyAreas?: DetectedArea[];
}> {
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

  // ═══════════════════════════════════════════
  // POINT-IN-POLYGON DETECTION (OFFLINE!)
  // ═══════════════════════════════════════════
  const detected = detectArea(position.lat, position.lng);
  const nearbyAreas = getAreasWithinRadius(position.lat, position.lng, 5); // 5km radius

  // Try reverse geocoding for full address (optional, non-blocking)
  let address = '';
  let city = 'Jaipur';
  try {
    const geoResult = await reverseGeocode(position.lat, position.lng);
    if (geoResult) {
      address = geoResult.formattedAddress;
      city = geoResult.city;
    }
  } catch (e) {
    // Reverse geocoding is optional
  }

  // Format address
  if (!address) {
    address = `${detected.name}, ${city}, Rajasthan (${position.lat.toFixed(4)}, ${position.lng.toFixed(4)})`;
  }

  return {
    ...position,
    address,
    city,
    area: detected.name,
    zone: detected.zone,
    pincode: detected.pincode,
    confidence: detected.confidence,
    nearbyAreas,
  };
}
