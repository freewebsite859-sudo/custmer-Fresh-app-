/**
 * GpsManager — Backwards-compatible facade over LocationService
 *
 * Old code imported gpsManager singleton; this adapter keeps API stable
 * while delegating to production-ready native GPS LocationService.
 */

import { locationService } from './location/LocationService';
import { AcceptedLocation, LocationStore } from './location/LocationStore';
import { haversineMeters } from './location/DistanceCalculator';

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

// Helpers to map AcceptedLocation -> LocationState
function toLocationState(loc: AcceptedLocation | null, permissionDenied = false, needsManual = false): LocationState {
  if (!loc) {
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
      permissionDenied,
      needsManualSelection: true,
    };
  }
  return {
    lat: loc.lat,
    lng: loc.lng,
    accuracy: loc.accuracy,
    area: loc.area ?? '',
    zone: loc.zone ?? '',
    pincode: loc.pincode ?? '',
    featureId: '',
    confidence: loc.area ? 'exact' : 'outside',
    city: loc.city ?? 'Jaipur',
    timestamp: loc.timestamp,
    source: loc.source,
    permissionDenied,
    needsManualSelection: false,
  };
}

class GpsManager {
  private listeners = new Set<LocationListener>();
  private unsubService: (() => void) | null = null;
  private unsubStatus: (() => void) | null = null;
  private state: LocationState | null = null;
  private permissionDenied = false;
  private needsManualSelection = false;
  private initPromise: Promise<LocationState> | null = null;

  async init(): Promise<LocationState> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._init();
    return this.initPromise;
  }

  private async _init(): Promise<LocationState> {
    // Hydrate from persisted store
    const loc = locationService.getLocation();
    const status = locationService.getStatus();
    this.permissionDenied = status.permissionDenied;
    this.needsManualSelection = status.permissionDenied || (status.message === 'Please enable location to discover nearby salons.');
    this.state = loc
      ? toLocationState(loc, this.permissionDenied, this.needsManualSelection)
      : toLocationState(null, this.permissionDenied, true);

    // Subscribe to service
    this.unsubService = locationService.subscribe((accepted) => {
      const s = locationService.getStatus();
      this.state = toLocationState(accepted, s.permissionDenied, false);
      this.notify();
    });
    this.unsubStatus = locationService.subscribeStatus((msg, denied) => {
      this.permissionDenied = denied;
      this.needsManualSelection = denied;
      if (this.state) {
        this.state.permissionDenied = denied;
        this.state.needsManualSelection = denied;
        // If permission denied and no location, propagate
        if (denied && !this.state.area) this.state.needsManualSelection = true;
        this.notify();
      }
    });

    await locationService.start();

    // If still no location after start, return current state
    const cur = locationService.getLocation();
    if (cur) this.state = toLocationState(cur, this.permissionDenied, false);

    this.notify();
    return this.state!;
  }

  subscribe(listener: LocationListener): () => void {
    this.listeners.add(listener);
    if (this.state) listener({ ...this.state });
    return () => this.listeners.delete(listener);
  }

  private notify() {
    if (!this.state) return;
    for (const l of this.listeners) {
      try { l({ ...this.state }); } catch {}
    }
  }

  setManualLocation(area: string, zone: string, pincode: string): void {
    locationService.setManualLocation(area, zone, pincode);
  }

  getState(): LocationState | null {
    return this.state ? { ...this.state } : null;
  }

  async forceRefresh(): Promise<LocationState | null> {
    await locationService.forceRefresh();
    const cur = locationService.getLocation();
    const s = locationService.getStatus();
    this.state = toLocationState(cur, s.permissionDenied, s.permissionDenied);
    this.notify();
    return this.state;
  }

  isPermissionDenied(): boolean {
    return this.permissionDenied;
  }

  needsManualSelectionFn(): boolean {
    return this.needsManualSelection;
  }

  stopWatching(): void {
    locationService.stop();
  }

  destroy(): void {
    locationService.stop();
    this.unsubService?.();
    this.unsubStatus?.();
    this.listeners.clear();
    this.state = null;
    this.initPromise = null;
  }
}

const gpsManager = new GpsManager();
export default gpsManager;
export { GpsManager };
export function clearCache(): void {
  try {
    localStorage.removeItem('nexora_gps_location_v2');
    localStorage.removeItem('nexora_gps_location');
  } catch {}
}
