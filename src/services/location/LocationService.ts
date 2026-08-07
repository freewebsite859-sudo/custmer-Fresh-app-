/**
 * LocationService — Central orchestrator (production-ready)
 *
 * Uses ONLY navigator.geolocation.watchPosition with { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
 * Implements intelligent GPS validation, 100m movement threshold, Permission handling,
 * continuous tracking, and comprehensive logging.
 *
 * Single responsibility orchestrator delegating to modular services.
 */

import { gpsWatcher } from './GpsWatcher';
import { LocationValidator, RawPosition } from './LocationValidator';
import { PermissionManager } from './PermissionManager';
import { locationStore, AcceptedLocation, LocationStatusMessage } from './LocationStore';
import { haversineMeters } from './DistanceCalculator';
import Logger from './Logger';
import { handleGpsError } from './ErrorHandler';

export type LocationUpdateListener = (loc: AcceptedLocation | null) => void;

class LocationService {
  private validator = new LocationValidator();
  private permissionManager = new PermissionManager();
  private updateCount = 0;
  private permissionState: string = 'prompt';
  private lastAcceptedLocation: AcceptedLocation | null = null;
  private fairTimer: number | null = null;
  private listeners = new Set<LocationUpdateListener>();
  private started = false;
  private isOnlineHandlerBound = false;

  // Thresholds per spec
  private readonly MOVE_THRESHOLD_M = 100;

  constructor() {
    // Load persisted location
    this.lastAcceptedLocation = locationStore.getLocation();
    if (this.lastAcceptedLocation) {
      this.validator.setLastAccepted({
        lat: this.lastAcceptedLocation.lat,
        lng: this.lastAcceptedLocation.lng,
        accuracy: this.lastAcceptedLocation.accuracy,
        timestamp: this.lastAcceptedLocation.timestamp,
        speed: this.lastAcceptedLocation.speed,
        heading: this.lastAcceptedLocation.heading,
      });
    }
  }

  /**
   * Start GPS tracking — call once on app mount.
   * Idempotent.
   */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    // Query permission
    try {
      this.permissionState = await this.permissionManager.query();
      if (this.permissionState === 'denied') {
        this.emitStatus('Please enable location to discover nearby salons.', true);
      } else {
        this.emitStatus('Detecting your location...', false);
      }
      this.permissionManager.subscribe((s) => {
        this.permissionState = s;
        if (s === 'denied') {
          this.emitStatus('Please enable location to discover nearby salons.', true);
        } else if (s === 'granted') {
          this.emitStatus('Detecting your location...', false);
        }
      });
    } catch {}

    // Check if geolocation supported
    if (!('geolocation' in navigator)) {
      Logger.error('Geolocation API not supported');
      this.emitStatus('Please enable location to discover nearby salons.', true);
      return;
    }

    // Check offline
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      Logger.warn('Device offline - GPS may be unavailable');
      // Still start watcher; it may work offline via GPS hardware
    }

    // Start watcher
    gpsWatcher.start(
      (pos) => this.handlePosition(pos),
      (err) => this.handleError(err),
    );

    // Timer for pending fair accuracy acceptance after 10s
    this.fairTimer = window.setInterval(() => {
      const pending = this.validator.checkPendingFairTimeout();
      if (pending) {
        Logger.info('Fair accuracy timeout - accepting pending location', { accuracy: pending.accuracy });
        this.acceptLocation(pending, `Fair accuracy ${Math.round(pending.accuracy)}m after 10s wait`);
      }
    }, 1000);

    // Handle online/offline events
    if (!this.isOnlineHandlerBound) {
      window.addEventListener('offline', () => {
        Logger.warn('Device went offline');
        this.emitStatus('GPS signal is weak...', false);
      });
      window.addEventListener('online', () => {
        Logger.info('Device back online');
        this.emitStatus('Detecting your location...', false);
      });
      this.isOnlineHandlerBound = true;
    }

    Logger.info('LocationService started', { provider: 'Browser / HTML5 Geolocation' });
  }

  stop(): void {
    gpsWatcher.stop();
    if (this.fairTimer !== null) {
      clearInterval(this.fairTimer);
      this.fairTimer = null;
    }
    this.started = false;
    Logger.info('LocationService stopped');
  }

  destroy(): void {
    this.stop();
    this.listeners.clear();
    this.permissionManager.destroy();
    this.validator.reset();
  }

  private handlePosition(pos: GeolocationPosition): void {
    this.updateCount++;

    const raw: RawPosition = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
      speed: pos.coords.speed ?? null,
      heading: pos.coords.heading ?? null,
    };

    Logger.debug(`Raw GPS reading #${this.updateCount}`, {
      lat: raw.lat,
      lng: raw.lng,
      accuracy: raw.accuracy,
      timestamp: raw.timestamp,
    });

    // Validate
    const decision = this.validator.validate(raw);

    if (!decision.accept) {
      Logger.gpsUpdate({
        count: this.updateCount,
        lat: raw.lat,
        lng: raw.lng,
        accuracy: raw.accuracy,
        timestamp: raw.timestamp,
        speed: raw.speed,
        heading: raw.heading,
        permission: this.permissionState,
        accepted: false,
        reason: decision.reason,
      });
      // Update status message
      this.emitStatus((decision as { accept: false; reason: string; statusMessage: string }).statusMessage as LocationStatusMessage, false);
      return;
    }

    // Accepted — but check 100m movement threshold for existing accepted location
    if (this.lastAcceptedLocation) {
      const moved = haversineMeters(raw.lat, raw.lng, this.lastAcceptedLocation.lat, this.lastAcceptedLocation.lng);
      if (moved < this.MOVE_THRESHOLD_M) {
        Logger.gpsUpdate({
          count: this.updateCount,
          lat: raw.lat,
          lng: raw.lng,
          accuracy: raw.accuracy,
          timestamp: raw.timestamp,
          speed: raw.speed,
          heading: raw.heading,
          permission: this.permissionState,
          accepted: false,
          reason: `Movement ${Math.round(moved)}m < ${this.MOVE_THRESHOLD_M}m threshold - ignored`,
        });
        // Do not update store, but emit "Location updated." if we have location
        this.emitStatus('Location updated.', false);
        return;
      }
      // Movement >=100m -> will recalculate
      this.acceptLocation(raw, decision.reason, moved);
    } else {
      // First accepted fix
      this.acceptLocation(raw, decision.reason, undefined);
    }
  }

  private acceptLocation(raw: RawPosition, reason: string, movementDistance?: number): void {
    const accepted: AcceptedLocation = {
      lat: raw.lat,
      lng: raw.lng,
      accuracy: raw.accuracy,
      timestamp: raw.timestamp,
      speed: raw.speed,
      heading: raw.heading,
      source: 'gps',
      city: 'Jaipur',
    };

    // Preserve area/zone from previous if any until geocoded via GeoService
    if (this.lastAcceptedLocation?.area) accepted.area = this.lastAcceptedLocation.area;

    this.lastAcceptedLocation = accepted;
    this.validator.setLastAccepted(raw);
    locationStore.setLocation(accepted);
    this.emitStatus('Location updated.', false);

    // Notify listeners; they can decide to recalc salons
    const shouldRecalc = typeof movementDistance === 'number' ? movementDistance >= this.MOVE_THRESHOLD_M : true;

    Logger.gpsUpdate({
      count: this.updateCount,
      lat: raw.lat,
      lng: raw.lng,
      accuracy: raw.accuracy,
      timestamp: raw.timestamp,
      speed: raw.speed,
      heading: raw.heading,
      permission: this.permissionState,
      accepted: true,
      reason,
      movementDistance,
      recalculating: shouldRecalc && typeof movementDistance === 'number',
    });

    for (const cb of this.listeners) {
      try { cb({ ...accepted }); } catch (e) { Logger.error('Listener error', { error: String(e) }); }
    }
  }

  private handleError(err: GeolocationPositionError): void {
    const info = handleGpsError(err, 'watchPosition');
    Logger.error(`GPS Error: ${info.message}`, { devMessage: info.devMessage, code: info.code });

    if (info.code === 'PERMISSION_DENIED') {
      this.emitStatus('Please enable location to discover nearby salons.', true);
      // Do not stop watcher; user may grant later
      return;
    }
    if (info.code === 'POSITION_UNAVAILABLE' || info.code === 'TIMEOUT') {
      this.emitStatus(info.message as LocationStatusMessage, false);
      return;
    }
    this.emitStatus(info.message as LocationStatusMessage, false);
  }

  private emitStatus(msg: LocationStatusMessage, permissionDenied: boolean) {
    locationStore.setStatus(msg, permissionDenied);
  }

  // Public API
  getLocation(): AcceptedLocation | null {
    return locationStore.getLocation();
  }

  getStatus(): { message: LocationStatusMessage; permissionDenied: boolean } {
    return locationStore.getStatus();
  }

  subscribe(listener: LocationUpdateListener): () => void {
    this.listeners.add(listener);
    // Immediately emit last known if exists
    const cur = this.getLocation();
    if (cur) listener({ ...cur });
    return () => this.listeners.delete(listener);
  }

  subscribeStatus(cb: (msg: LocationStatusMessage, denied: boolean) => void): () => void {
    return locationStore.subscribeStatus(cb);
  }

  /**
   * Manual location selection (when permission denied or user picks)
   */
  setManualLocation(area: string, zone: string, pincode: string): void {
    const loc: AcceptedLocation = {
      lat: this.lastAcceptedLocation?.lat ?? 0,
      lng: this.lastAcceptedLocation?.lng ?? 0,
      accuracy: 0,
      timestamp: Date.now(),
      speed: null,
      heading: null,
      area,
      zone,
      pincode,
      city: 'Jaipur',
      source: 'manual',
    };
    this.lastAcceptedLocation = loc;
    locationStore.setLocation(loc);
    for (const cb of this.listeners) {
      try { cb({ ...loc }); } catch {}
    }
  }

  /**
   * Force refresh — emergency fallback using getCurrentPosition with same validation
   */
  async forceRefresh(): Promise<AcceptedLocation | null> {
    try {
      const pos = await gpsWatcher.getCurrentPositionOnce();
      this.handlePosition(pos);
      return this.getLocation();
    } catch (e) {
      const info = handleGpsError(e, 'forceRefresh');
      this.emitStatus(info.message as LocationStatusMessage, info.code === 'PERMISSION_DENIED');
      return this.getLocation();
    }
  }

  getUpdateCount(): number {
    return this.updateCount;
  }

  getPermissionState(): string {
    return this.permissionState;
  }
}

export const locationService = new LocationService();
export default LocationService;
