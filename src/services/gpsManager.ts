/**
 * GPS MANAGER
 * 
 * Auto-detection lifecycle:
 *   1. App starts → load cached location INSTANTLY
 *   2. Request GPS permission
 *   3. Get coordinates → detect locality offline (GeoJSON PIP)
 *   4. Store: area, zone, pincode, coordinates
 *   5. Refresh ONLY if user moves > 300 meters
 *   6. If permission denied → manual selection mode
 * 
 * Key behavior:
 *   - Cached area shown INSTANTLY on app start
 *   - GPS detection happens in background
 *   - Area ONLY changes if user physically moves 300m+
 *   - GPS jitter (low accuracy) does NOT trigger re-detection
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
const MOVE_THRESHOLD_M = 300;       // Re-detect after 300m movement
const MIN_ACCURACY_M = 100;         // Ignore GPS readings worse than 100m accuracy
const CITY_SLUG = 'jaipur';

// ═══════════════════════════════════════
// HAVERSINE DISTANCE (meters)
// ═══════════════════════════════════════

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
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
    if (data.area && typeof data.lat === 'number' && typeof data.lng === 'number') {
      return data;
    }
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
  private lastDetectedLat = 0;
  private lastDetectedLng = 0;
  private listeners: Set<LocationListener> = new Set();
  private watchId: number | null = null;
  private geoIndex: CityIndex | null = null;
  private initialized = false;
  private initPromise: Promise<LocationState> | null = null;
  private geoLoaded = false;

  /**
   * Initialize GPS manager.
   * Call once on app start.
   */
  async init(): Promise<LocationState> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<LocationState> {
    // ═══ STEP 1: Load cached location INSTANTLY ═══
    const cached = loadCache();
    if (cached && cached.area) {
      this.state = { ...cached, source: 'cache' };
      this.lastDetectedLat = cached.lat;
      this.lastDetectedLng = cached.lng;
      this.notify();
    }

    // ═══ STEP 2: Load GeoJSON (async, cached) ═══
    try {
      this.geoIndex = await GeoService.loadCity(CITY_SLUG);
      this.geoLoaded = true;
    } catch (e) {
      console.warn('[GpsManager] GeoJSON load failed:', e);
    }

    // ═══ STEP 3: Request GPS ═══
    if (!('geolocation' in navigator)) {
      return this.handleNoGps();
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const result = this.handlePosition(pos, true);
          this.startWatching();
          this.initialized = true;
          resolve(result);
        },
        (err) => {
          const result = this.handleGpsError(err);
          this.initialized = true;
          resolve(result);
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 30000,
        }
      );
    });
  }

  /**
   * Handle GPS position update.
   * Only re-detects area if user moved > 300m.
   */
  private handlePosition(pos: GeolocationPosition, forceDetect = false): LocationState {
    const { latitude: lat, longitude: lng, accuracy } = pos.coords;
    const timestamp = pos.timestamp;

    // ═══ FILTER: Ignore bad GPS readings ═══
    // If accuracy is worse than 100m, skip (jitter protection)
    if (accuracy > MIN_ACCURACY_M && !forceDetect) {
      return this.state || this.createDefaultState();
    }

    // ═══ CHECK: Has user moved > 300m? ═══
    if (!forceDetect && this.lastDetectedLat !== 0 && this.lastDetectedLng !== 0) {
      const moved = distanceMeters(this.lastDetectedLat, this.lastDetectedLng, lat, lng);
      if (moved < MOVE_THRESHOLD_M) {
        // User hasn't moved enough — keep current area
        return this.state || this.createDefaultState();
      }
    }

    // ═══ DETECT: Run PIP on new coordinates ═══
    let detection: DetectionResult | null = null;
    if (this.geoIndex) {
      detection = this.geoIndex.detect(lat, lng);
    }

    const newState: LocationState = {
      lat,
      lng,
      accuracy,
      area: detection?.area || this.state?.area || '',
      zone: detection?.zone || this.state?.zone || '',
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
    this.lastDetectedLat = lat;
    this.lastDetectedLng = lng;
    saveCache(newState);
    this.notify();

    return newState;
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
   * GPS not available — use cache if available
   */
  private handleNoGps(): LocationState {
    const cached = loadCache();
    if (cached && cached.area) {
      this.state = { ...cached, source: 'cache' };
      this.notify();
      return this.state;
    }
    const state = this.createDefaultState();
    state.needsManualSelection = true;
    this.state = state;
    this.notify();
    return state;
  }

  /**
   * Permission denied — use cache or manual mode
   */
  private handlePermissionDenied(): LocationState {
    const cached = loadCache();
    if (cached && cached.area) {
      this.state = { ...cached, source: 'cache', permissionDenied: true };
      this.notify();
      return this.state;
    }
    const state = this.createDefaultState();
    state.permissionDenied = true;
    state.needsManualSelection = true;
    this.state = state;
    this.notify();
    return state;
  }

  /**
   * Create default empty state
   */
  private createDefaultState(): LocationState {
    return {
      lat: 0,
      lng: 0,
      accuracy: 0,
      area: '',
      zone: '',
      pincode: '',
      featureId: '',
      confidence: 'outside',
      city: 'Jaipur',
      timestamp: Date.now(),
      source: 'manual',
      permissionDenied: false,
      needsManualSelection: true,
    };
  }

  /**
   * Start watching GPS for 300m movement
   */
  private startWatching(): void {
    if (this.watchId !== null) return;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handlePosition(pos, false),
      () => {}, // Ignore watch errors silently
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 10000,
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
      try { listener({ ...this.state }); } catch {}
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
      permissionDenied: false,
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
          const result = this.handlePosition(pos, true);
          resolve(result);
        },
        () => resolve(this.state),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  }

  isPermissionDenied(): boolean {
    return this.state?.permissionDenied || false;
  }

  needsManualSelection(): boolean {
    return this.state?.needsManualSelection || false;
  }

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
