/**
 * useCurrentLocation — React hook for live GPS detection, Google Geocoding, and distance sorting.
 */

import { useState, useEffect, useCallback } from 'react';
import { CurrentLocation, LocationError, RadiusOption } from '../services/location/locationTypes';
import { locationService } from '../services/location/LocationService';
import { calculateHaversineDistanceKm, formatDistance } from '../services/location/DistanceCalculator';

export interface UseCurrentLocationResult {
  location: CurrentLocation | null;
  isLoading: boolean;
  error: LocationError | null;
  permissionDenied: boolean;
  areaName: string;
  cityName: string;
  formattedDisplay: string;
  refreshLocation: () => Promise<CurrentLocation | null>;
  setManualLocation: (localityName: string, coords?: { lat: number; lng: number }) => CurrentLocation;
  sortSalons: <T extends { lat?: number; lng?: number; distanceKm?: number; rating?: number; verified?: boolean }>(
    salons: T[]
  ) => Array<T & { distanceKm: number; formattedDistance: string }>;
  filterSalons: <T extends { lat?: number; lng?: number; distanceKm?: number; rating?: number; verified?: boolean }>(
    salons: T[],
    radiusKm: RadiusOption
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

  /**
   * Display string shown in the header location button.
   * Spec:
   *  - "📍 Detecting your location..." while loading
   *  - "📍 Location not available" on failure
   *  - "📍 <area>, <city>" (or area/city alone) when resolved
   *  No hardcoded city fallback is ever shown.
   */
  const formattedDisplay = (() => {
    if (isLoading) {
      return '📍 Detecting your location...';
    }
    if (error) {
      return '📍 Location not available';
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
      // GPS resolved but geocoding returned no locality — show coordinates.
      return `📍 ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
    return '📍 Location not available';
  })();

  const setManualLocation = useCallback(
    (localityName: string, coords?: { lat: number; lng: number }): CurrentLocation => {
      const loc = locationService.setManualLocation(localityName, coords);
      setLocation(loc);
      setError(null);
      setIsLoading(false);
      return loc;
    },
    []
  );

  /**
   * Sort salons by:
   * 1. Nearest Distance (km)
   * 2. Highest Rating
   * 3. Featured (verified)
   */
  const sortSalons = useCallback(
    <T extends { lat?: number; lng?: number; distanceKm?: number; rating?: number; verified?: boolean }>(
      salons: T[]
    ): Array<T & { distanceKm: number; formattedDistance: string }> => {
      const userLat = location?.latitude;
      const userLng = location?.longitude;
      const hasUserCoords = typeof userLat === 'number' && typeof userLng === 'number';

      return salons
        .map((s) => {
          const sLat = s.lat ?? 0;
          const sLng = s.lng ?? 0;
          const hasSalonCoords = Number.isFinite(sLat) && Number.isFinite(sLng) && !(sLat === 0 && sLng === 0);

          const distanceKm = hasUserCoords && hasSalonCoords
            ? calculateHaversineDistanceKm(userLat, userLng, sLat, sLng)
            : (s.distanceKm && s.distanceKm > 0 ? s.distanceKm : 999);

          return {
            ...s,
            distanceKm: Math.round(distanceKm * 100) / 100,
            formattedDistance: formatDistance(distanceKm),
          };
        })
        .sort((a, b) => {
          // 1. Nearest Distance
          if (a.distanceKm !== b.distanceKm) {
            return a.distanceKm - b.distanceKm;
          }
          // 2. Highest Rating
          const aRating = a.rating ?? 0;
          const bRating = b.rating ?? 0;
          if (bRating !== aRating) {
            return bRating - aRating;
          }
          // 3. Featured / Verified
          if (a.verified !== b.verified) {
            return a.verified ? -1 : 1;
          }
          return 0;
        });
    },
    [location]
  );

  const filterSalons = useCallback(
    <T extends { lat?: number; lng?: number; distanceKm?: number; rating?: number; verified?: boolean }>(
      salons: T[],
      radiusKm: RadiusOption
    ): Array<T & { distanceKm: number; formattedDistance: string }> => {
      const sorted = sortSalons(salons);
      if (radiusKm === 'all') {
        return sorted;
      }
      return sorted.filter((s) => s.distanceKm <= radiusKm);
    },
    [sortSalons]
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
    setManualLocation,
    sortSalons,
    filterSalons,
  };
}

export default useCurrentLocation;
