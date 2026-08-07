/**
 * LocationService — Production GPS detection and location management.
 * Coordinates navigator.geolocation and Google Geocoding API.
 */

import { CurrentLocation, LocationError } from './locationTypes';
import { GoogleGeocoder } from './GoogleGeocoder';

const STORAGE_KEY = 'nexora_current_location';

const GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0,
};

type LocationSubscriber = (location: CurrentLocation | null, error: LocationError | null) => void;

class LocationService {
  private currentLocation: CurrentLocation | null = null;
  private currentError: LocationError | null = null;
  private isDetecting = false;
  private subscribers = new Set<LocationSubscriber>();

  constructor() {
    this.hydrateFromStorage();
  }

  private hydrateFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Number.isFinite(parsed.latitude) && Number.isFinite(parsed.longitude)) {
          this.currentLocation = parsed;
        }
      }
    } catch {
      // Storage unavailable or corrupted
    }
  }

  public getLocation(): CurrentLocation | null {
    return this.currentLocation;
  }

  public getError(): LocationError | null {
    return this.currentError;
  }

  public subscribe(subscriber: LocationSubscriber): () => void {
    this.subscribers.add(subscriber);
    subscriber(this.currentLocation, this.currentError);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private emit(): void {
    for (const sub of this.subscribers) {
      try {
        sub(this.currentLocation, this.currentError);
      } catch (e) {
        console.warn('Location subscriber notice:', e);
      }
    }
  }

  /**
   * Detects the user's current GPS location using native browser geolocation
   * and converts coordinates to a human-readable area via Google Geocoding.
   */
  public async detectLocation(forceRefresh = false): Promise<CurrentLocation> {
    if (this.isDetecting) {
      if (this.currentLocation && !forceRefresh) {
        return this.currentLocation;
      }
    }

    if (!('geolocation' in navigator)) {
      const err: LocationError = {
        type: 'POSITION_UNAVAILABLE',
        message: 'Geolocation is not supported by your browser or device.',
      };
      this.currentError = err;
      this.emit();
      throw err;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const err: LocationError = {
        type: 'OFFLINE',
        message: 'No internet connection. Please check your network to detect location.',
      };
      this.currentError = err;
      this.emit();
      throw err;
    }

    this.isDetecting = true;
    this.currentError = null;

    try {
      // 1. Get high accuracy GPS coordinates
      const position = await this.getBrowserPosition();
      const { latitude, longitude, accuracy } = position.coords;

      // 2. Reverse geocode via Google Geocoding API
      let geocoded;
      try {
        geocoded = await GoogleGeocoder.reverseGeocode(latitude, longitude);
      } catch (geoErr: any) {
        console.warn('Google geocoding notice:', geoErr?.message || geoErr);
        geocoded = {
          area: 'Jaipur',
          sublocality: '',
          neighborhood: '',
          locality: 'Jaipur',
          district: 'Jaipur',
          state: 'Rajasthan',
          country: 'India',
          formattedAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        };
      }

      // 3. Assemble CurrentLocation object
      const location: CurrentLocation = {
        latitude,
        longitude,
        area: geocoded.area || 'Jaipur',
        sublocality: geocoded.sublocality || undefined,
        neighborhood: geocoded.neighborhood || undefined,
        locality: geocoded.locality || 'Jaipur',
        district: geocoded.district || undefined,
        city: geocoded.locality || 'Jaipur',
        state: geocoded.state || 'Rajasthan',
        country: geocoded.country || 'India',
        formattedAddress: geocoded.formattedAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        accuracy: Math.round(accuracy || 0),
        timestamp: position.timestamp || Date.now(),
      };

      this.currentLocation = location;
      this.currentError = null;
      this.saveToStorage(location);
      this.emit();
      return location;
    } catch (error: any) {
      const handled = this.mapGeolocationError(error);
      this.currentError = handled;
      this.emit();
      throw handled;
    } finally {
      this.isDetecting = false;
    }
  }

  private getBrowserPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, GPS_OPTIONS);
    });
  }

  private mapGeolocationError(err: any): LocationError {
    if (err && err.type) {
      return err as LocationError;
    }

    if (typeof err === 'object' && 'code' in err) {
      const code = (err as GeolocationPositionError).code;
      switch (code) {
        case 1: // PERMISSION_DENIED
          return {
            type: 'PERMISSION_DENIED',
            code: 1,
            message: 'Please enable location to discover nearby salons.',
            originalError: err,
          };
        case 2: // POSITION_UNAVAILABLE
          return {
            type: 'POSITION_UNAVAILABLE',
            code: 2,
            message: 'Unable to acquire your GPS position. Please make sure location/GPS is enabled on your device.',
            originalError: err,
          };
        case 3: // TIMEOUT
          return {
            type: 'TIMEOUT',
            code: 3,
            message: 'Location request timed out. Please tap to retry.',
            originalError: err,
          };
        default:
          return {
            type: 'UNKNOWN',
            code,
            message: err.message || 'Unable to detect your location. Tap to Retry.',
            originalError: err,
          };
      }
    }

    return {
      type: 'UNKNOWN',
      message: err?.message || 'Unable to detect your location. Tap to Retry.',
      originalError: err,
    };
  }

  private saveToStorage(location: CurrentLocation): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    } catch {
      // Storage unavailable
    }
  }

  public clearLocation(): void {
    this.currentLocation = null;
    this.currentError = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.emit();
  }
}

export const locationService = new LocationService();
export default locationService;
