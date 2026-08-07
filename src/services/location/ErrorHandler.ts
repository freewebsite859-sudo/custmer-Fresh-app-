/**
 * ErrorHandler — Graceful GPS error handling with user-friendly messages + dev logs
 */
import Logger from './Logger';

export type GpsErrorCode = 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'NOT_SUPPORTED' | 'WEAK_SIGNAL' | 'OFFLINE' | 'UNKNOWN';

export interface GpsErrorInfo {
  code: GpsErrorCode;
  message: string; // user-friendly
  devMessage: string;
  recoverable: boolean;
  retryable: boolean;
}

export function mapGeolocationError(err: GeolocationPositionError): GpsErrorInfo {
  switch (err.code) {
    case 1:
      return {
        code: 'PERMISSION_DENIED',
        message: 'Please enable location to discover nearby salons.',
        devMessage: `Geolocation permission denied: ${err.message}`,
        recoverable: true,
        retryable: true,
      };
    case 2:
      return {
        code: 'POSITION_UNAVAILABLE',
        message: 'GPS signal is weak...',
        devMessage: `Position unavailable: ${err.message}`,
        recoverable: true,
        retryable: true,
      };
    case 3:
      return {
        code: 'TIMEOUT',
        message: 'Waiting for better GPS accuracy...',
        devMessage: `GPS timeout: ${err.message}`,
        recoverable: true,
        retryable: true,
      };
    default:
      return {
        code: 'UNKNOWN',
        message: 'Unable to determine location. Please check GPS settings.',
        devMessage: err.message || 'Unknown geolocation error',
        recoverable: true,
        retryable: true,
      };
  }
}

export function handleGpsError(err: unknown, context: string): GpsErrorInfo {
  if (typeof GeolocationPositionError !== 'undefined' && err instanceof GeolocationPositionError) {
    const info = mapGeolocationError(err);
    Logger.error(`${context}: ${info.devMessage}`, { code: info.code });
    return info;
  }
  if (err instanceof Error) {
    if (err.message.includes('not supported') || err.message.includes('Not supported')) {
      const info: GpsErrorInfo = {
        code: 'NOT_SUPPORTED',
        message: 'Location is not supported in this browser.',
        devMessage: err.message,
        recoverable: false,
        retryable: false,
      };
      Logger.error(`${context}: ${info.devMessage}`, { code: info.code });
      return info;
    }
    const info: GpsErrorInfo = {
      code: 'UNKNOWN',
      message: 'GPS signal is weak...',
      devMessage: err.message,
      recoverable: true,
      retryable: true,
    };
    Logger.error(`${context}: ${info.devMessage}`, { code: info.code });
    return info;
  }
  const info: GpsErrorInfo = { code: 'UNKNOWN', message: 'GPS signal is weak...', devMessage: String(err), recoverable: true, retryable: true };
  Logger.error(`${context}: ${info.devMessage}`, { code: info.code });
  return info;
}

export const ErrorHandler = { mapGeolocationError, handleGpsError };
export default ErrorHandler;
