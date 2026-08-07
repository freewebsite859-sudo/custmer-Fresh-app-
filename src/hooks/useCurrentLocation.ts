/**
 * useCurrentLocation — React hook for live GPS detection, Google Geocoding, and distance sorting.
 */

import { useState, useEffect, useCallback } from 'react';
import { CurrentLocation, LocationError } from '../services/location/locationTypes';
import { locationService } from '../services/location/LocationService';
import { sortNearby } from '../services/location/DistanceCalculator';

export interface UseCurrentLocationResult {
  location: CurrentLocation | null;
  isLoading: boolean;
  error: LocationError | null;
  permissionDenied: boolean;
  areaName: string;
  cityName: string;
  formattedDisplay: string;
  refreshLocation: () => Promise<CurrentLocation | null>;
  sortSalons: <T extends { lat?: number; lng?: number; distanceKm?: number }>(
    salons: T[]
  ) => Array<T & { distanceKm: number; formattedDistance: string }>;
  filterSalons: <T extends { lat?: number; lng?: number; distanceKm?: number }>(
    salons: T[],
    radiusKm: number | 'all'
  ) => Array<T & { distanceKm: number; formattedDistance: string }>;
}

export function useCurrentLocation(autoDetect = true): UseCurrentLocationResult {
  const [location, setLocation] = useState<CurrentLocation | null>(() => locationService.getLocation());
  const [error, setError] = useState<LocationError | null>(() => locationService.getError());
  const [isLoading, setIsLoading] = useState<boolean>(!locationService.getLocation() && autoDetect);

  // Subscribe to LocationService updates
  useEffect(() => {
    const unsubscribe = locationService.subscribe((loc, err) => {
      setLocation(loc);
      setError(err);
      if (loc || err) {
        setIsLoading(false);
      }
    });

    if (autoDetect && !locationService.getLocation()) {
      setIsLoading(true);
      locationService.detectLocation(false).catch((err) => {
        console.warn('Auto-detect location notice:', err?.message || err);
      });
    }

    return unsubscribe;
  }, [autoDetect]);

  const refreshLocation = useCallback(async (): Promise<CurrentLocation | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const loc = await locationService.detectLocation(true);
      setLocation(loc);
      return loc;
    } catch (err: any) {
      setError(err as LocationError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const permissionDenied = error?.type === 'PERMISSION_DENIED';

  // Area & City display helpers
  const areaName = location?.area || '';
  const cityName = location?.city || '';

  const formattedDisplay = (() => {
    if (isLoading) {
      return 'Detecting location...';
    }
    if (error) {
      return 'Unable to detect location';
    }
    if (location) {
      if (location.area && location.city && location.area !== location.city) {
        return `📍 ${location.area}, ${location.city}`;
      }
      if (location.area) {
        return `📍 ${location.area}`;
      }
      if (location.city) {
        return `📍 ${location.city}`;
      }
    }
    return 'Location not configured';
  })();

  const sortSalons = useCallback(
    <T extends { lat?: number; lng?: number; distanceKm?: number }>(
      salons: T[]
    ): Array<T & { distanceKm: number; formattedDistance: string }> => {
      if (!location) {
        return salons.map((s) => ({
          ...s,
          distanceKm: s.distanceKm || 0,
          formattedDistance: s.distanceKm ? `${s.distanceKm} km` : '',
        }));
      }
      return sortNearby(salons, location.latitude, location.longitude);
    },
    [location]
  );

  const filterSalons = useCallback(
    <T extends { lat?: number; lng?: number; distanceKm?: number }>(
      salons: T[],
      radiusKm: number | 'all'
    ): Array<T & { distanceKm: number; formattedDistance: string }> => {
      const sorted = sortSalons(salons);
      if (radiusKm === 'all' || !location) {
        return sorted;
      }
      return sorted.filter((s) => s.distanceKm <= radiusKm);
    },
    [sortSalons, location]
  );

  return {
    location,
    isLoading,
    error,
    permissionDenied,
    areaName,
    cityName,
    formattedDisplay,
    refreshLocation,
    sortSalons,
    filterSalons,
  };
}

export default useCurrentLocation;
