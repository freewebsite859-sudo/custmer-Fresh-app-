/**
 * LIVE GEOLOCATION UTILITY
 * 
 * GPS → Google API fallback → Dynamic GeoJSON area detection
 * 
 * No hardcoded locality names!
 * Area detection loads from /geo/{city}.geojson dynamically.
 * Add new cities by placing a .geojson file in public/geo/
 */

import GeoService, { DetectedArea, CityGeoIndex } from '../services/geoService';

const GOOGLE_GEOLOCATION_API_KEY = import.meta.env.VITE_GOOGLE_GEOLOCATION_API_KEY || 'AIzaSyA-Gcqz5-iQbqm0vPfk98ONrtAENUX3dTk';

export interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface LiveLocationResult extends GeoPosition {
  address: string;
  city: string;
  area: string;
  zone: string;
  pincode: string;
  confidence: string;
  nearbyAreas: DetectedArea[];
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
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, timestamp: pos.timestamp }),
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
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ considerIp: true }),
  });
  if (!res.ok) { const e = await res.json().catch(() => null); throw new Error(e?.error?.message || `Geo API error ${res.status}`); }
  const d = await res.json();
  return { lat: d.location.lat, lng: d.location.lng, accuracy: d.accuracy, timestamp: Date.now() };
}

// ═══════════════════════════════════════
// REVERSE GEOCODING (optional, for full address)
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
 * Get live location with automatic GPS → API → GeoJSON detection.
 * 
 * @param citySlug  city to load GeoJSON for (default "jaipur")
 *                  to support a new city, just add /geo/{citySlug}.geojson
 */
export async function getLiveLocation(citySlug = 'jaipur'): Promise<LiveLocationResult> {
  // 1. Get GPS coordinates
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

  // 2. Load city GeoJSON (cached after first load)
  const geo: CityGeoIndex = await GeoService.loadCity(citySlug);

  // 3. Point-in-Polygon detection (offline!)
  const detected = geo.detect(pos.lat, pos.lng);
  const nearby = geo.nearby(pos.lat, pos.lng, 5);

  // 4. Optional reverse geocoding for full address
  let address = '';
  try { address = (await reverseGeocode(pos.lat, pos.lng)) || ''; } catch {}

  if (!address) {
    address = `${detected.name}, ${geo.city}, Rajasthan (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`;
  }

  return {
    ...pos,
    address,
    city: geo.city,
    area: detected.name,
    zone: detected.zone,
    pincode: detected.pincode,
    confidence: detected.confidence,
    nearbyAreas: nearby,
  };
}
