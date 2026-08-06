/**
 * useGpsLocation — React hook for GPS auto-detection
 * 
 * Usage:
 *   const { location, isLoading, permissionDenied, needsManual, setManual } = useGpsLocation();
 * 
 * Lifecycle:
 *   1. App starts → GPS manager initializes
 *   2. Returns cached location instantly
 *   3. Detects area offline via GeoJSON PIP
 *   4. Auto-refreshes when user moves > 300m
 *   5. If permission denied → needsManual = true
 */

import { useState, useEffect, useCallback } from 'react';
import gpsManager, { LocationState } from '../services/gpsManager';

interface UseGpsLocationResult {
  location: LocationState | null;
  isLoading: boolean;
  permissionDenied: boolean;
  needsManual: boolean;
  setManual: (area: string, zone: string, pincode: string) => void;
  forceRefresh: () => Promise<void>;
}

export function useGpsLocation(): UseGpsLocationResult {
  const [location, setLocation] = useState<LocationState | null>(gpsManager.getState());
  const [isLoading, setIsLoading] = useState(!gpsManager.getState());

  useEffect(() => {
    // Subscribe to GPS updates
    const unsubscribe = gpsManager.subscribe((state) => {
      setLocation({ ...state });
      setIsLoading(false);
    });

    // Initialize GPS manager (only runs once)
    gpsManager.init().then(() => {
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
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
    setManual,
    forceRefresh,
  };
}

export default useGpsLocation;
