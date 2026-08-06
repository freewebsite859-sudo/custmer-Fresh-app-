/**
 * GPS MANAGER
 * 
 * Auto-detection lifecycle:
 *   1. App starts → request GPS permission
 *   2. Get coordinates → detect locality offline (GeoJSON PIP)
 *   3. Store: area, zone, pincode, coordinates
 *   4. Refresh only if user moves > 300 meters
 *   5. Cache last detected area
 *   6. If permission denied → manual selection mode
 * 
 * No API calls for area detection.
 */

import GeoService, { DetectionResult, CityIndex } from './geoService';

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

export interface LocationState {
  lat: number;
  lng: number;
  accuracy: number;
  area: string;
  zone: string;
  pincode: string;
  featureId: string;
  confidence: 'exact' | 'nearest' | 'outside';
  city: string;
  timestamp: number;
  source: 'gps' | 'cache' | 'manual';
  permissionDenied: boolean;
  needsManualSelection: boolean;
}

export type LocationListener = (state: LocationState) => void;

// ═══════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════

const CACHE_KEY = 'nexora_gps_location';
const MOVE_THRESHOLD_M = 300; // Re-detect after 300m movement
const WATCH_INTERVAL_MS = 15000; // Check position every 15s
const CITY_SLUG = 'jaipur';

// ═══════════════════════════════════════
// HAVERSINE DISTANCE (meters)
// ═══════════════════════════════════════

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
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
// CACHE HELPERS
// ═══════════════════════════════════════

function loadCache(): LocationState | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as LocationState;
    // Validate cache has required fields
    if (data.lat && data.lng && data.area) return data;
    return null;
  } catch {
    return null;
  }
}

function saveCache(state: LocationState): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(state));
  } catch {}
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

// ═══════════════════════════════════════
// GPS MANAGER CLASS
// ═══════════════════════════════════════

class GpsManager {
  private state: LocationState | null = null;
  private listeners: Set<LocationListener> = new Set();
  private watchId: number | null = null;
  private geoIndex: CityIndex | null = null;
  private initialized = false;
  private initPromise: Promise<LocationState> | null = null;

  /**
   * Initialize GPS manager.
   * Call once on app start.
   * 
   * Flow:
   *   1. Load cached location (instant)
   *   2. Load GeoJSON (async, cached)
   *   3. Request GPS permission
   *   4. If granted → detect area → notify listeners
   *   5. If denied → set manual mode → notify listeners
   *   6. Start watching for 300m movement
   */
  async init(): Promise<LocationState> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<LocationState> {
    // Step 1: Load cached location (instant fallback)
    const cached = loadCache();
    if (cached) {
      this.state = { ...cached, source: 'cache' };
      this.notify();
    }

    // Step 2: Load GeoJSON (async, cached after first load)
    try {
      this.geoIndex = await GeoService.loadCity(CITY_SLUG);
    } catch (e) {
      console.warn('[GpsManager] GeoJSON load failed:', e);
    }

    // Step 3: Request GPS permission
    if (!('geolocation' in navigator)) {
      return this.handleNoGps();
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.handlePosition(pos);
          this.startWatching();
          this.initialized = true;
          resolve(this.state!);
        },
        (err) => {
          const result = this.handleGpsError(err);
          this.initialized = true;
          resolve(result);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        }
      );
    });
  }

  /**
   * Handle successful GPS position
   */
  private handlePosition(pos: GeolocationPosition): void {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    const timestamp = pos.timestamp;

    // Check if moved > 300m from last position
    if (this.state?.lat && this.state?.lng) {
      const moved = distanceMeters(this.state.lat, this.state.lng, lat, lng);
      if (moved < MOVE_THRESHOLD_M) {
        // Not moved enough — keep existing detection
        return;
      }
    }

    // Detect area offline using GeoJSON PIP
    let detection: DetectionResult | null = null;
    if (this.geoIndex) {
      detection = this.geoIndex.detect(lat, lng);
    }

    const newState: LocationState = {
      lat,
      lng,
      accuracy,
      area: detection?.area || this.state?.area || 'Jaipur',
      zone: detection?.zone || this.state?.zone || 'Jaipur',
      pincode: detection?.pincode || this.state?.pincode || '',
      featureId: detection?.featureId || '',
      confidence: detection?.confidence || 'outside',
      city: this.geoIndex?.city || 'Jaipur',
      timestamp,
      source: 'gps',
      permissionDenied: false,
      needsManualSelection: false,
    };

    this.state = newState;
    saveCache(newState);
    this.notify();
  }

  /**
   * Handle GPS errors
   */
  private handleGpsError(err: GeolocationPositionError): LocationState {
    switch (err.code) {
      case 1: // PERMISSION_DENIED
        return this.handlePermissionDenied();
      case 2: // POSITION_UNAVAILABLE
      case 3: // TIMEOUT
      default:
        return this.handleNoGps();
    }
  }

  /**
   * GPS not available
   */
  private handleNoGps(): LocationState {
    const cached = loadCache();
    const state: LocationState = {
      lat: cached?.lat || 0,
      lng: cached?.lng || 0,
      accuracy: 0,
      area: cached?.area || '',
      zone: cached?.zone || '',
      pincode: cached?.pincode || '',
      featureId: '',
      confidence: 'outside',
      city: 'Jaipur',
      timestamp: Date.now(),
      source: cached ? 'cache' : 'manual',
      permissionDenied: false,
      needsManualSelection: !cached,
    };
    this.state = state;
    this.notify();
    return state;
  }

  /**
   * Permission denied — switch to manual mode
   */
  private handlePermissionDenied(): LocationState {
    const cached = loadCache();
    const state: LocationState = {
      lat: cached?.lat || 0,
      lng: cached?.lng || 0,
      accuracy: 0,
      area: cached?.area || '',
      zone: cached?.zone || '',
      pincode: cached?.pincode || '',
      featureId: '',
      confidence: 'outside',
      city: 'Jaipur',
      timestamp: Date.now(),
      source: cached ? 'cache' : 'manual',
      permissionDenied: true,
      needsManualSelection: !cached,
    };
    this.state = state;
    this.notify();
    return state;
  }

  /**
   * Start watching GPS for 300m movement
   */
  private startWatching(): void {
    if (this.watchId !== null) return;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos),
      () => {}, // Ignore watch errors silently
      {
        enableHighAccuracy: false, // Low accuracy OK for movement detection
        timeout: 30000,
        maximumAge: WATCH_INTERVAL_MS,
      }
    );
  }

  /**
   * Stop watching GPS
   */
  stopWatching(): void {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /**
   * Subscribe to location changes
   */
  subscribe(listener: LocationListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    if (this.state) {
      listener(this.state);
    }
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notify(): void {
    if (!this.state) return;
    for (const listener of this.listeners) {
      try { listener(this.state); } catch {}
    }
  }

  /**
   * Set manual location (when GPS denied or user picks manually)
   */
  setManualLocation(area: string, zone: string, pincode: string): void {
    const state: LocationState = {
      lat: this.state?.lat || 0,
      lng: this.state?.lng || 0,
      accuracy: 0,
      area,
      zone,
      pincode,
      featureId: '',
      confidence: 'exact',
      city: 'Jaipur',
      timestamp: Date.now(),
      source: 'manual',
      permissionDenied: this.state?.permissionDenied || false,
      needsManualSelection: false,
    };
    this.state = state;
    saveCache(state);
    this.notify();
  }

  /**
   * Get current state
   */
  getState(): LocationState | null {
    return this.state;
  }

  /**
   * Force refresh (bypass 300m threshold)
   */
  async forceRefresh(): Promise<LocationState | null> {
    if (!('geolocation' in navigator)) return this.state;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          // Reset state to force re-detection
          if (this.state) {
            this.state.lat = 0;
            this.state.lng = 0;
          }
          this.handlePosition(pos);
          resolve(this.state);
        },
        () => resolve(this.state),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  /**
   * Check if GPS permission was denied
   */
  isPermissionDenied(): boolean {
    return this.state?.permissionDenied || false;
  }

  /**
   * Check if manual selection is needed
   */
  needsManualSelection(): boolean {
    return this.state?.needsManualSelection || false;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopWatching();
    this.listeners.clear();
    this.state = null;
    this.initialized = false;
    this.initPromise = null;
  }
}

// ═══════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════

const gpsManager = new GpsManager();
export default gpsManager;
export { GpsManager };
