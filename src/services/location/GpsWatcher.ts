/**
 * GpsWatcher — Singleton watchPosition manager
 * - Only one active watcher at any time
 * - Uses exactly { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
 * - Proper cleanup via clearWatch
 */
import Logger from './Logger';

export const GPS_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
};

export type PositionCallback = (pos: GeolocationPosition) => void;
export type ErrorCallback = (err: GeolocationPositionError) => void;

class GpsWatcher {
  private watchId: number | null = null;
  private onPosition: PositionCallback | null = null;
  private onError: ErrorCallback | null = null;

  isWatching(): boolean {
    return this.watchId !== null;
  }

  /**
   * Start watching. If already watching, cleans up previous watcher first.
   */
  start(onPosition: PositionCallback, onError: ErrorCallback): void {
    if (!('geolocation' in navigator)) {
      Logger.error('Geolocation not supported by browser');
      onError({ code: 2, message: 'Geolocation not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
      return;
    }
    // Ensure single watcher
    this.stop();

    this.onPosition = onPosition;
    this.onError = onError;

    Logger.info('Starting watchPosition', { options: GPS_OPTIONS });

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.onPosition?.(pos),
      (err) => this.onError?.(err),
      GPS_OPTIONS,
    );
  }

  /**
   * Emergency fallback using getCurrentPosition with same options & validation rules.
   * Used only if watchPosition fails to deliver but browser requires getCurrentPosition.
   */
  async getCurrentPositionOnce(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, GPS_OPTIONS);
    });
  }

  stop(): void {
    if (this.watchId !== null) {
      try {
        navigator.geolocation.clearWatch(this.watchId);
        Logger.info('Cleared watchPosition', { watchId: this.watchId });
      } catch (e) {
        Logger.warn('clearWatch failed', { error: String(e) });
      }
      this.watchId = null;
    }
    this.onPosition = null;
    this.onError = null;
  }

  destroy(): void {
    this.stop();
  }
}

export const gpsWatcher = new GpsWatcher();
export default GpsWatcher;
