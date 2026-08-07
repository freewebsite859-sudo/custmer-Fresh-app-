/**
 * LocationValidator — Intelligent GPS validation per spec
 *
 * Accuracy rules:
 *  0–15m  → Excellent, accept immediately
 *  16–30m → Good, accept
 *  31–50m → Wait up to 10s for better fix, else accept best
 *  51–100m→ Continue waiting, show "Improving your location..."
 *  >100m  → Reject
 *
 * Also rejects invalid coords, duplicates, impossible jumps.
 */

export interface RawPosition {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  speed: number | null;
  heading: number | null;
}

export type ValidationDecision =
  | { accept: true; reason: string }
  | { accept: false; reason: string; statusMessage: string };

export interface ValidatorConfig {
  excellentThreshold: number; // 15
  goodThreshold: number; // 30
  fairThreshold: number; // 50
  poorThreshold: number; // 100
  fairWaitMs: number; // 10000
  duplicateThresholdM: number; // 5m considered duplicate
  impossibleJumpM: number; // e.g. 50000m (50km) instant jump -> reject
}

const DEFAULT_CONFIG: ValidatorConfig = {
  excellentThreshold: 15,
  goodThreshold: 30,
  fairThreshold: 50,
  poorThreshold: 100,
  fairWaitMs: 10_000,
  duplicateThresholdM: 5,
  impossibleJumpM: 50_000,
};

import { haversineMeters } from './DistanceCalculator';

export class LocationValidator {
  private config: ValidatorConfig;
  private isFirstReading = true;
  private pendingFair: RawPosition | null = null;
  private pendingFairSince = 0;
  private lastAccepted: RawPosition | null = null;

  constructor(config: Partial<ValidatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  reset() {
    this.isFirstReading = true;
    this.pendingFair = null;
    this.pendingFairSince = 0;
    this.lastAccepted = null;
  }

  setLastAccepted(pos: RawPosition | null) {
    this.lastAccepted = pos;
    if (pos) this.isFirstReading = false;
  }

  /**
   * Validate a raw GPS reading.
   * Returns accept/reject decision and user-facing status message.
   */
  validate(pos: RawPosition): ValidationDecision {
    // 1. Validate coords
    if (!Number.isFinite(pos.lat) || !Number.isFinite(pos.lng) || Math.abs(pos.lat) > 90 || Math.abs(pos.lng) > 180) {
      return { accept: false, reason: 'Invalid coordinates', statusMessage: 'GPS signal is weak...' };
    }
    if (pos.lat === 0 && pos.lng === 0) {
      return { accept: false, reason: 'Invalid coordinates (0,0)', statusMessage: 'GPS signal is weak...' };
    }

    // 2. Timestamp must be newer
    if (this.lastAccepted && pos.timestamp <= this.lastAccepted.timestamp) {
      return { accept: false, reason: 'Stale timestamp', statusMessage: 'Waiting for better GPS accuracy...' };
    }

    // 3. Mark the first reading as seen. Do not discard a precise first fix:
    // on many mobile browsers watchPosition only delivers one fix initially, so
    // rejecting it made the “Use My Current Location” action fail every time.
    if (this.isFirstReading) {
      this.isFirstReading = false;
    }

    // 4. Duplicate check (very small movement vs last accepted)
    if (this.lastAccepted) {
      const dupDist = haversineMeters(pos.lat, pos.lng, this.lastAccepted.lat, this.lastAccepted.lng);
      if (dupDist < this.config.duplicateThresholdM && Math.abs(pos.accuracy - this.lastAccepted.accuracy) < 5) {
        return { accept: false, reason: `Duplicate update (moved ${dupDist.toFixed(1)}m)`, statusMessage: 'Location updated.' };
      }
      // Impossible jump
      if (dupDist > this.config.impossibleJumpM) {
        return { accept: false, reason: `Impossible jump ${Math.round(dupDist)}m`, statusMessage: 'GPS signal is weak...' };
      }
    }

    // 5. Accuracy rules
    const acc = pos.accuracy;

    if (acc <= this.config.excellentThreshold) {
      this.clearPendingFair();
      return { accept: true, reason: `Excellent accuracy ${Math.round(acc)}m` };
    }
    if (acc <= this.config.goodThreshold) {
      this.clearPendingFair();
      return { accept: true, reason: `Good accuracy ${Math.round(acc)}m` };
    }
    if (acc <= this.config.fairThreshold) {
      // 31-50 : wait up to 10s for better fix
      if (!this.pendingFair) {
        this.pendingFair = pos;
        this.pendingFairSince = Date.now();
        return { accept: false, reason: `Accuracy ${Math.round(acc)}m - waiting up to 10s for better fix`, statusMessage: 'Improving your location...' };
      }
      // If we have pending fair, check if we received better (handled by accept branches above)
      // If time expired, accept best fair
      const elapsed = Date.now() - this.pendingFairSince;
      if (elapsed >= this.config.fairWaitMs) {
        // Accept the best between pending and current
        const best = this.pendingFair.accuracy <= acc ? this.pendingFair : pos;
        this.clearPendingFair();
        return { accept: true, reason: `Fair accuracy ${Math.round(best.accuracy)}m after ${Math.round(elapsed / 1000)}s wait` };
      }
      // Keep waiting; update pending if current is better
      if (acc < this.pendingFair.accuracy) this.pendingFair = pos;
      return { accept: false, reason: `Accuracy ${Math.round(acc)}m - waiting for better fix (${Math.round((this.config.fairWaitMs - elapsed) / 1000)}s remaining)`, statusMessage: 'Improving your location...' };
    }
    if (acc <= this.config.poorThreshold) {
      // 51-100 : continue waiting
      return { accept: false, reason: `Accuracy ${Math.round(acc)}m > 50m - waiting for better fix`, statusMessage: 'Improving your location...' };
    }
    // >100
    return { accept: false, reason: `Accuracy ${Math.round(acc)}m > 100m - rejected`, statusMessage: 'GPS signal is weak...' };
  }

  /** Called by service on timer to check if pending fair should be accepted after timeout */
  checkPendingFairTimeout(): RawPosition | null {
    if (!this.pendingFair) return null;
    const elapsed = Date.now() - this.pendingFairSince;
    if (elapsed >= this.config.fairWaitMs) {
      const pos = this.pendingFair;
      this.clearPendingFair();
      return pos;
    }
    return null;
  }

  private clearPendingFair() {
    this.pendingFair = null;
    this.pendingFairSince = 0;
  }

  /** Expose pending for service */
  getPendingFair(): RawPosition | null {
    return this.pendingFair;
  }
}

export default LocationValidator;
