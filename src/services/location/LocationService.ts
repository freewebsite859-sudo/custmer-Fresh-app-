/**
 * LocationService — Production GPS detection and location management.
 * Coordinates navigator.geolocation and Google Geocoding API.
 *
 * Design rules (per product spec):
 *  - Uses navigator.geolocation.getCurrentPosition with enableHighAccuracy.
 *  - Reverse-geocodes via Google Geocoding API using VITE_GOOGLE_MAPS_API_KEY.
 *  - NEVER falls back to a hardcoded city (e.g. "Jaipur").
 *  - If GPS succeeds but geocoding fails, coordinates are KEPT (so Nearby
 *    Salons can still be distance-sorted) but a `geocodingError` is surfaced
 *    so the UI can show "Unable to detect location" + Retry instead of
 *    printing raw latitude/longitude.
 */

import { CurrentLocation, LocationError } from './locationTypes';
import { GoogleGeocoder } from './GoogleGeocoder';
import { findLocalityCoordinates } from '../../data/jaipurLocalities';

const STORAGE_KEY = 'nexora_current_location';
const MANUAL_SOURCE = 'manual';

const GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 20000,
  maximumAge: 0,
};

type LocationSubscriber = (location: CurrentLocation | null, error: LocationError | null) => void;

class LocationService {
  private currentLocation: CurrentLocation | null = null;
  private currentError: LocationError | null = null;
  private geocodingError: LocationError | null = null;
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

  public getGeocodingError(): LocationError | null {
    return this.geocodingError;
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
      this.geocodingError = null;
      this.emit();
      throw err;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const err: LocationError = {
        type: 'OFFLINE',
        message: 'No internet connection. Please check your network to detect location.',
      };
      this.currentError = err;
      this.geocodingError = null;
      this.emit();
      throw err;
    }

    this.isDetecting = true;
    this.currentError = null;
    this.geocodingError = null;

    try {
      // 1. Get high accuracy GPS coordinates
      const position = await this.getBrowserPosition();
      const { latitude, longitude, accuracy } = position.coords;

      // 2. Reverse geocode via Google Geocoding API.
      //    On failure we DO NOT throw away GPS, and we DO NOT invent a city.
      //    We keep the coordinates (for distance sorting) and remember the
      //    geocoding error so the UI can show an honest "Retry" state.
      let geocoded;
      try {
        geocoded = await GoogleGeocoder.reverseGeocode(latitude, longitude);
        this.geocodingError = null;
      } catch (geoErr: any) {
        const geoError = (geoErr as LocationError) || {
          type: 'GEOCODING_FAILED' as const,
          message: 'Unable to resolve your address from GPS coordinates.',
        };
        console.warn('[LocationService] Google geocoding failed:', geoError.message, geoErr);
        this.geocodingError = geoError;

        const coordsLocation: CurrentLocation = {
          latitude,
          longitude,
          area: '',
          city: '',
          state: '',
          country: '',
          formattedAddress: '',
          accuracy: Math.round(accuracy || 0),
          timestamp: position.timestamp || Date.now(),
          source: 'gps',
        } as CurrentLocation;

        this.currentLocation = coordsLocation;
        this.currentError = geoError;
        this.saveToStorage(coordsLocation);
        this.emit();
        return coordsLocation;
      }

      // 3. Assemble CurrentLocation object. Best locality follows the
      //    priority sublocality -> neighborhood -> locality. Empty strings
      //    remain empty (no "Jaipur" hardcoding).
      const bestArea =
        geocoded.area || geocoded.sublocality || geocoded.neighborhood || geocoded.locality || '';

      const location: CurrentLocation = {
        latitude,
        longitude,
        area: bestArea,
        sublocality: geocoded.sublocality || undefined,
        neighborhood: geocoded.neighborhood || undefined,
        locality: geocoded.locality || undefined,
        district: geocoded.district || undefined,
        city: geocoded.locality || '',
        state: geocoded.state || '',
        country: geocoded.country || '',
        formattedAddress: geocoded.formattedAddress || '',
        accuracy: Math.round(accuracy || 0),
        timestamp: position.timestamp || Date.now(),
        source: 'gps',
      } as CurrentLocation;

      this.currentLocation = location;
      this.currentError = null;
      this.geocodingError = null;
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

  /**
   * Retry only the geocoding step for an already-detected GPS position.
   * Used by the UI "Tap to Retry" action when GPS worked but the Google
   * call failed — avoids re-prompting the user for location permission.
   */
  public async retryGeocoding(): Promise<CurrentLocation | null> {
    if (!this.currentLocation) {
      return this.detectLocation(true);
    }
    const { latitude, longitude, accuracy } = this.currentLocation;
    try {
      const geocoded = await GoogleGeocoder.reverseGeocode(latitude, longitude);
      const bestArea =
        geocoded.area || geocoded.sublocality || geocoded.neighborhood || geocoded.locality || '';
      const location: CurrentLocation = {
        ...this.currentLocation,
        area: bestArea,
        sublocality: geocoded.sublocality || undefined,
        neighborhood: geocoded.neighborhood || undefined,
        locality: geocoded.locality || undefined,
        district: geocoded.district || undefined,
        city: geocoded.locality || '',
        state: geocoded.state || '',
        country: geocoded.country || '',
        formattedAddress: geocoded.formattedAddress || '',
        accuracy: accuracy || 0,
        source: 'gps',
      } as CurrentLocation;
      this.currentLocation = location;
      this.currentError = null;
      this.geocodingError = null;
      this.saveToStorage(location);
      this.emit();
      return location;
    } catch (geoErr: any) {
      const geoError = (geoErr as LocationError) || {
        type: 'GEOCODING_FAILED' as const,
        message: 'Unable to resolve your address from GPS coordinates.',
      };
      this.geocodingError = geoError;
      this.currentError = geoError;
      this.emit();
      return null;
    }
  }

  /**
   * Sets the location manually from the LocationSelectionModal (one of the
   * 100+ Jaipur localities). Explicit user choice — no hardcoded default.
   */
  public setManualLocation(localityName: string, coords?: { lat: number; lng: number }): CurrentLocation {
    const resolved = coords || findLocalityCoordinates(localityName);
    if (!resolved) {
      const err: LocationError = {
        type: 'POSITION_UNAVAILABLE',
        message: `Coordinates not available for "${localityName}".`,
      };
      this.currentError = err;
      this.emit();
      throw err;
    }

    const location: CurrentLocation = {
      latitude: resolved.lat,
      longitude: resolved.lng,
      area: localityName,
      sublocality: localityName,
      neighborhood: undefined,
      locality: 'Jaipur',
      district: 'Jaipur',
      city: 'Jaipur',
      state: 'Rajasthan',
      country: 'India',
      formattedAddress: `${localityName}, Jaipur, Rajasthan, India`,
      accuracy: 0,
      timestamp: Date.now(),
      source: 'manual',
    } as CurrentLocation;

    this.currentLocation = location;
    this.currentError = null;
    this.geocodingError = null;
    this.saveToStorage(location);
    this.emit();
    return location;
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
        case 1:
          return {
            type: 'PERMISSION_DENIED',
            code: 1,
            message: 'Please enable location to discover nearby salons.',
            originalError: err,
          };
        case 2:
          return {
            type: 'POSITION_UNAVAILABLE',
            code: 2,
            message:
              'Unable to acquire your GPS position. Please make sure location/GPS is enabled on your device.',
            originalError: err,
          };
        case 3:
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
    this.geocodingError = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.emit();
  }
}

export const locationService = new LocationService();
export default locationService;
