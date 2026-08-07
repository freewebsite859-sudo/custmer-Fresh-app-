/**
 * PermissionManager — Browser Permissions API wrapper for geolocation
 */
import Logger from './Logger';

export type PermissionState = 'granted' | 'prompt' | 'denied' | 'unsupported';

export class PermissionManager {
  private current: PermissionState = 'prompt';
  private listeners = new Set<(s: PermissionState) => void>();
  private permissionStatus: PermissionStatus | null = null;

  async query(): Promise<PermissionState> {
    if (!navigator.permissions || !navigator.permissions.query) {
      Logger.info('Permissions API not supported, assuming prompt');
      this.current = 'prompt';
      return this.current;
    }
    try {
      // Type cast because TS lib may not include 'geolocation' in some envs
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      this.permissionStatus = status;
      this.current = status.state as PermissionState;
      Logger.info(`Permission status: ${this.current}`);
      // Listen for changes
      status.onchange = () => {
        this.current = status.state as PermissionState;
        Logger.info(`Permission changed: ${this.current}`);
        this.notify();
      };
      return this.current;
    } catch (e) {
      Logger.warn('Permissions query failed', { error: String(e) });
      this.current = 'prompt';
      return this.current;
    }
  }

  get(): PermissionState {
    return this.current;
  }

  subscribe(cb: (s: PermissionState) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    for (const cb of this.listeners) {
      try { cb(this.current); } catch {}
    }
  }

  destroy() {
    if (this.permissionStatus) {
      this.permissionStatus.onchange = null;
      this.permissionStatus = null;
    }
    this.listeners.clear();
  }
}

export const permissionManager = new PermissionManager();
export default PermissionManager;
