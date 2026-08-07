/**
 * LocationStore — Centralized accepted location state
 * Holds latest validated location (lat,lng,accuracy,timestamp,speed,heading)
 */

export interface AcceptedLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  speed: number | null;
  heading: number | null;
  area?: string;
  zone?: string;
  pincode?: string;
  city?: string;
  source: 'gps' | 'manual' | 'cache';
}

export type LocationStatusMessage =
  | 'Detecting your location...'
  | 'Improving your location...'
  | 'GPS signal is weak...'
  | 'Location updated.'
  | 'Waiting for better GPS accuracy...'
  | 'Please enable location to discover nearby salons.'
  | '';

export type LocationListener = (state: AcceptedLocation | null) => void;
export type StatusListener = (msg: LocationStatusMessage, permissionDenied: boolean) => void;

const STORAGE_KEY = 'nexora_gps_location_v2';

export class LocationStore {
  private location: AcceptedLocation | null = null;
  private statusMessage: LocationStatusMessage = '';
  private permissionDenied = false;
  private listeners = new Set<LocationListener>();
  private statusListeners = new Set<StatusListener>();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AcceptedLocation;
        if (Number.isFinite(parsed.lat) && Number.isFinite(parsed.lng)) {
          this.location = parsed;
        }
      }
      if (!this.location) {
        const legacy = localStorage.getItem('nexora_gps_location');
        if (legacy) {
          try {
            const p = JSON.parse(legacy);
            if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
              this.location = {
                lat: p.lat,
                lng: p.lng,
                accuracy: p.accuracy ?? 0,
                timestamp: p.timestamp ?? Date.now(),
                speed: p.speed ?? null,
                heading: p.heading ?? null,
                area: p.area,
                zone: p.zone,
                pincode: p.pincode,
                city: p.city ?? 'Jaipur',
                source: p.source ?? 'cache',
              };
              this.persist();
            }
          } catch {}
        }
      }
    } catch {}
  }

  private persist() {
    try {
      if (this.location) localStorage.setItem(STORAGE_KEY, JSON.stringify(this.location));
    } catch {}
  }

  setLocation(loc: AcceptedLocation) {
    this.location = loc;
    this.persist();
    this.notifyLocation();
  }

  setStatus(msg: LocationStatusMessage, permissionDenied: boolean) {
    this.statusMessage = msg;
    this.permissionDenied = permissionDenied;
    this.notifyStatus();
  }

  getLocation(): AcceptedLocation | null {
    return this.location ? { ...this.location } : null;
  }

  getStatus(): { message: LocationStatusMessage; permissionDenied: boolean } {
    return { message: this.statusMessage, permissionDenied: this.permissionDenied };
  }

  subscribeLocation(cb: LocationListener): () => void {
    this.listeners.add(cb);
    if (this.location) cb({ ...this.location });
    return () => this.listeners.delete(cb);
  }

  subscribeStatus(cb: StatusListener): () => void {
    this.statusListeners.add(cb);
    cb(this.statusMessage, this.permissionDenied);
    return () => this.statusListeners.delete(cb);
  }

  private notifyLocation() {
    for (const cb of this.listeners) {
      try { cb(this.location ? { ...this.location } : null); } catch {}
    }
  }

  private notifyStatus() {
    for (const cb of this.statusListeners) {
      try { cb(this.statusMessage, this.permissionDenied); } catch {}
    }
  }

  clear() {
    this.location = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    this.notifyLocation();
  }
}

export const locationStore = new LocationStore();
export default LocationStore;
