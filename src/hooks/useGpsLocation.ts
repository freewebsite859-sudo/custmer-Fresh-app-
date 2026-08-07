/**
 * useGpsLocation — React hook for GPS (native watchPosition only)
 * Wraps LocationService with React lifecycle, status messages & permission handling.
 */
import { useState, useEffect, useCallback } from 'react';
import gpsManager, { LocationState } from '../services/gpsManager';
import { locationService } from '../services/location/LocationService';
import { LocationStatusMessage } from '../services/location/LocationStore';

interface UseGpsLocationResult {
  location: LocationState | null;
  isLoading: boolean;
  permissionDenied: boolean;
  needsManual: boolean;
  statusMessage: LocationStatusMessage;
  setManual: (area: string, zone: string, pincode: string) => void;
  forceRefresh: () => Promise<void>;
}

export function useGpsLocation(): UseGpsLocationResult {
  const [location, setLocation] = useState<LocationState | null>(gpsManager.getState());
  const [isLoading, setIsLoading] = useState(!gpsManager.getState()?.area);
  const [statusMessage, setStatusMessage] = useState<LocationStatusMessage>(
    () => locationService.getStatus().message || 'Detecting your location...',
  );

  useEffect(() => {
    const unsub = gpsManager.subscribe((state) => {
      setLocation({ ...state });
      setIsLoading(false);
    });
    const unsubStatus = locationService.subscribeStatus((msg) => {
      setStatusMessage(msg);
    });

    gpsManager
      .init()
      .then(() => setIsLoading(false))
      .catch(() => setIsLoading(false));

    return () => {
      unsub();
      unsubStatus();
    };
  }, []);

  const setManual = useCallback((area: string, zone: string, pincode: string) => {
    gpsManager.setManualLocation(area, zone, pincode);
  }, []);

  const forceRefresh = useCallback(async () => {
    setIsLoading(true);
    await gpsManager.forceRefresh();
    setIsLoading(false);
  }, []);

  return {
    location,
    isLoading,
    permissionDenied: location?.permissionDenied || false,
    needsManual: location?.needsManualSelection || false,
    statusMessage,
    setManual,
    forceRefresh,
  };
}

export default useGpsLocation;
