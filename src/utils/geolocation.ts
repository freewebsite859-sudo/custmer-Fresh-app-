/**
 * LIVE GEOLOCATION UTILITY
 * 
 * GPS → Google API fallback → Point-in-Polygon area detection
 * 
 * Detection flow:
 *   1. Browser GPS (primary)
 *   2. Google Geolocation API (fallback)
 *   3. Spatial grid → PIP → nearest centroid → "Outside Jaipur Coverage"
 * 
 * Add new cities by placing /geo/{city}.geojson — zero code changes!
 */

import GeoService, { DetectionResult, CityIndex } from '../services/geoService';

const GOOGLE_GEOLOCATION_API_KEY = import.meta.env.VITE_GOOGLE_GEOLOCATION_API_KEY || 'AIzaSyA-Gcqz5-iQbqm0vPfk98ONrtAENUX3dTk';

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface LiveLocationResult extends GeoPosition {
  found: boolean;
  area: string;
  zone: string;
  pincode: string;
  featureId: string;
  confidence: 'exact' | 'nearest' | 'outside';
  distanceFromCenter: number;
  address: string;
  city: string;
  nearbyAreas: Array<{ area: string; zone: string; pincode: string; distance: number }>;
  lookupMs: number;
}

// ═══════════════════════════════════════
// BROWSER GEOLOCATION
// ═══════════════════════════════════════

export function isGeolocationAvailable(): boolean {
  return 'geolocation' in navigator;
}

export function getBrowserPosition(timeout = 20000): Promise<GeoPosition> {
  return new Promise((resolve, reject) => {
    if (!isGeolocationAvailable()) {
      reject(new Error('Geolocation is not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      }),
      (err) => {
        switch (err.code) {
          case 1: reject(new Error('Location permission denied. Please enable location in browser settings.')); break;
          case 2: reject(new Error('Location unavailable. Trying alternative...')); break;
          case 3: reject(new Error('Location timed out. Trying alternative...')); break;
          default: reject(new Error('Unknown location error'));
        }
      },
      { enableHighAccuracy: true, timeout, maximumAge: 60000 }
    );
  });
}

export function watchPosition(
  onUpdate: (pos: GeoPosition) => void,
  onError: (err: Error) => void
): () => void {
  if (!isGeolocationAvailable()) { onError(new Error('Geolocation not supported')); return () => {}; }
  const id = navigator.geolocation.watchPosition(
    (pos) => onUpdate({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp }),
    (err) => onError(new Error(err.code === 1 ? 'Permission denied' : err.code === 2 ? 'Unavailable' : 'Timeout')),
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 15000 }
  );
  return () => navigator.geolocation.clearWatch(id);
}

// ═══════════════════════════════════════
// GOOGLE GEOLOCATION API FALLBACK
// ═══════════════════════════════════════

export async function getGoogleGeoPosition(): Promise<GeoPosition> {
  const res = await fetch(`https://www.googleapis.com/geolocation/v1/geolocate?key=${GOOGLE_GEOLOCATION_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ considerIp: true }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => null);
    throw new Error(e?.error?.message || `Geo API error ${res.status}`);
  }
  const d = await res.json();
  return { lat: d.location.lat, lng: d.location.lng, accuracy: d.accuracy, timestamp: Date.now() };
}

// ═══════════════════════════════════════
// REVERSE GEOCODING (optional)
// ═══════════════════════════════════════

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_GEOLOCATION_API_KEY}`);
    if (!res.ok) return null;
    const d = await res.json();
    return d.results?.[0]?.formatted_address ?? null;
  } catch { return null; }
}

// ═══════════════════════════════════════
// DISTANCE HELPER
// ═══════════════════════════════════════

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

// ═══════════════════════════════════════
// MAIN: getLiveLocation()
// ═══════════════════════════════════════

/**
 * Get live location with Point-in-Polygon detection.
 * 
 * Detection rules:
 *   1. Point inside polygon  → return that locality (confidence: "exact")
 *   2. No polygon match      → find nearest centroid
 *   3. Distance < 5km        → return nearest locality (confidence: "nearest")
 *   4. Distance >= 5km       → "Outside Jaipur Coverage" (confidence: "outside")
 * 
 * @param citySlug  city to load GeoJSON for (default "jaipur")
 */
export async function getLiveLocation(citySlug = 'jaipur'): Promise<LiveLocationResult> {
  // ── Step 1: Get GPS coordinates ──
  let pos: GeoPosition;
  try {
    pos = await getBrowserPosition();
  } catch (browserErr) {
    console.warn('Browser GPS failed, trying Google API:', browserErr);
    try {
      pos = await getGoogleGeoPosition();
    } catch {
      throw new Error('Unable to determine location. Check internet and location permissions.');
    }
  }

  // ── Step 2: Load city GeoJSON (cached after first load) ──
  const geo: CityIndex = await GeoService.loadCity(citySlug);

  // ── Step 3: Point-in-Polygon detection ──
  const detection: DetectionResult = geo.detect(pos.lat, pos.lng);

  // ── Step 4: Get nearby areas ──
  const nearbyResult = geo.nearby(pos.lat, pos.lng, 5);

  // ── Step 5: Optional reverse geocoding ──
  let address = '';
  try { address = (await reverseGeocode(pos.lat, pos.lng)) || ''; } catch {}

  if (!address) {
    if (detection.found) {
      address = `${detection.area}, ${geo.city}, Rajasthan`;
    } else {
      address = `(${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`;
    }
  }

  // ── Step 6: Build result ──
  return {
    ...pos,
    found: detection.found,
    area: detection.area,
    zone: detection.zone,
    pincode: detection.pincode,
    featureId: detection.featureId,
    confidence: detection.confidence,
    distanceFromCenter: detection.distanceFromCenter,
    address,
    city: geo.city,
    nearbyAreas: nearbyResult.areas,
    lookupMs: detection.lookupMs,
  };
}
