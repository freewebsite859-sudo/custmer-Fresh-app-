/**
 * Geolocation utility — Native GPS only (no external providers)
 *
 * Uses ONLY navigator.geolocation.watchPosition with highAccuracy.
 * No Google API, no reverse geocoding, no IP fallback.
 *
 * For full production usage import from '@/services/location/LocationService'
 */

import { haversineKm } from '../services/location/DistanceCalculator';

// Re-export for backwards compatibility
export { haversineKm as calculateDistance };
export { haversineKm };

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

/** Check if geolocation is available */
export function isGeolocationAvailable(): boolean {
  return 'geolocation' in navigator;
}

/**
 * Emergency fallback: single getCurrentPosition with spec-compliant options.
 * Prefer LocationService.start() + watchPosition for continuous tracking.
 */
export function getBrowserPosition(timeout = 15000): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationAvailable()) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: pos.timestamp,
        }),
      (err) => {
        switch (err.code) {
          case 1:
            reject(new Error('Please enable location to discover nearby salons.'));
            break;
          case 2:
            reject(new Error('GPS signal is weak...'));
            break;
          case 3:
            reject(new Error('Waiting for better GPS accuracy...'));
            break;
          default:
            reject(new Error('Unknown location error'));
        }
      },
      { enableHighAccuracy: true, timeout, maximumAge: 0 },
    );
  });
}

/**
 * Single-watcher wrapper — delegates to native watchPosition with spec options.
 * Prefer LocationService for validated tracking.
 */
export function watchPosition(onUpdate: (pos: GeoPosition) => void, onError: (err: Error) => void): () => void {
  if (!isGeolocationAvailable()) {
    onError(new Error('Geolocation not supported'));
    return () => {};
  }
  const id = navigator.geolocation.watchPosition(
    (pos) =>
      onUpdate({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      }),
    (err) => onError(new Error(err.code === 1 ? 'Please enable location to discover nearby salons.' : err.code === 2 ? 'GPS signal is weak...' : 'Waiting for better GPS accuracy...')),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
  return () => navigator.geolocation.clearWatch(id);
}
