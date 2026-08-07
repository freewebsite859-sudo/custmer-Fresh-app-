/**
 * Logger — Centralized debug logging for GPS system
 * Provides structured, detailed logs for every GPS update.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const PREFIX = '[Nexora GPS]';

export const Logger = {
  debug(message: string, data?: Record<string, unknown>) {
    console.debug(`${PREFIX} ${message}`, data ?? '');
  },
  info(message: string, data?: Record<string, unknown>) {
    console.log(`${PREFIX} ${message}`, data ?? '');
  },
  warn(message: string, data?: Record<string, unknown>) {
    console.warn(`${PREFIX} ${message}`, data ?? '');
  },
  error(message: string, data?: Record<string, unknown>) {
    console.error(`${PREFIX} ${message}`, data ?? '');
  },

  /**
   * Detailed GPS update log — matches spec example format
   */
  gpsUpdate(params: {
    count: number;
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: number;
    speed: number | null;
    heading: number | null;
    permission: string;
    accepted: boolean;
    reason: string;
    movementDistance?: number;
    recalculating?: boolean;
  }) {
    const status = params.accepted ? 'Accepted' : 'Rejected';
    const lines = [
      `GPS Update #${params.count}`,
      `Latitude: ${params.lat.toFixed(6)}`,
      `Longitude: ${params.lng.toFixed(6)}`,
      `Accuracy: ${Math.round(params.accuracy)}m`,
      `Timestamp: ${new Date(params.timestamp).toISOString()}`,
      `Speed: ${params.speed ?? 'N/A'}  Heading: ${params.heading ?? 'N/A'}`,
      `Permission: ${params.permission}  Provider: Browser / HTML5 Geolocation`,
      ``,
      status,
      ``,
      `Reason: ${params.reason}`,
    ];
    if (params.accepted) {
      lines.push(`Saving location...`);
      if (typeof params.movementDistance === 'number') lines.push(`Movement: ${Math.round(params.movementDistance)}m`);
      if (params.recalculating) {
        lines.push(`Recalculating salon distances...`);
        lines.push(`Sorting salons...`);
        lines.push(`UI refreshed.`);
      }
    } else {
      lines.push(`Waiting for better GPS...`);
    }
    console.log(`${PREFIX} \n${lines.join('\n')}`);
  },
};

export default Logger;
