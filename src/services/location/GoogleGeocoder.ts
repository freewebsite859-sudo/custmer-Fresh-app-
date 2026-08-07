/**
 * GoogleGeocoder — Production Google Maps Geocoding API integration.
 * Converts GPS coordinates into Sublocality, Locality, State, and Country.
 * 
 * Preferred Display hierarchy:
 *   Sublocality (e.g. "Vaishali Nagar")
 *   ↓
 *   Locality (e.g. "Jaipur")
 *   ↓
 *   State (e.g. "Rajasthan")
 */

import { GeocodingResult, LocationError } from './locationTypes';

// In-memory cache for recent reverse geocoding results
const geocodeCache = new Map<string, GeocodingResult>();

/**
 * Retrieves the Google Maps API Key strictly from Vite environment variables.
 * Never hardcoded.
 */
export function getGoogleApiKey(): string {
  const key =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.VITE_GOOGLE_GEOCODING_API_KEY ||
    import.meta.env.VITE_GOOGLE_API_KEY ||
    import.meta.env.VITE_MAPS_API_KEY ||
    '';
  return key.trim();
}

/**
 * Reverse geocodes latitude & longitude into structured administrative components.
 * 
 * @param latitude User GPS Latitude
 * @param longitude User GPS Longitude
 * @param customApiKey Optional override API key
 * @returns GeocodingResult with extracted Sublocality, Locality, State, and Country
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
  customApiKey?: string
): Promise<GeocodingResult> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  const apiKey = customApiKey || getGoogleApiKey();

  if (!apiKey) {
    // If no Google Maps API key is configured in .env, throw descriptive error
    const err: LocationError = {
      type: 'INVALID_API_KEY',
      message: 'Google Maps API key is not configured in .env (VITE_GOOGLE_MAPS_API_KEY).',
    };
    throw err;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${encodeURIComponent(apiKey)}&language=en`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const err: LocationError = {
        type: 'GEOCODING_FAILED',
        message: `Google Geocoding HTTP error: ${response.status} ${response.statusText}`,
      };
      throw err;
    }

    const data = await response.json();

    if (data.status === 'OK' && Array.isArray(data.results) && data.results.length > 0) {
      const extracted = parseGoogleGeocodingResults(data.results);
      geocodeCache.set(cacheKey, extracted);
      return extracted;
    }

    if (data.status === 'ZERO_RESULTS') {
      const err: LocationError = {
        type: 'GEOCODING_FAILED',
        message: 'No address found for these GPS coordinates.',
        originalError: data,
      };
      throw err;
    }

    if (data.status === 'OVER_QUERY_LIMIT') {
      const err: LocationError = {
        type: 'QUOTA_EXCEEDED',
        message: 'Google Geocoding API quota exceeded. Please check billing or usage limits.',
        originalError: data,
      };
      throw err;
    }

    if (data.status === 'REQUEST_DENIED') {
      const err: LocationError = {
        type: 'INVALID_API_KEY',
        message: data.error_message || 'Google Geocoding request denied. Check API key permissions and billing.',
        originalError: data,
      };
      throw err;
    }

    const err: LocationError = {
      type: 'GEOCODING_FAILED',
      message: data.error_message || `Google Geocoding failed with status: ${data.status}`,
      originalError: data,
    };
    throw err;
  } catch (error: any) {
    if (error && error.type) {
      throw error;
    }
    const err: LocationError = {
      type: 'GEOCODING_FAILED',
      message: error?.message || 'Network error while contacting Google Geocoding API.',
      originalError: error,
    };
    throw err;
  }
}

/**
 * Parses Google Geocoding address components according to priority:
 * Sublocality -> Locality -> Administrative Area (State) -> Country
 */
function parseGoogleGeocodingResults(results: any[]): GeocodingResult {
  let sublocality = '';
  let locality = '';
  let state = '';
  let country = '';
  let formattedAddress = results[0]?.formatted_address || '';
  const placeId = results[0]?.place_id || '';

  for (const result of results) {
    if (!Array.isArray(result.address_components)) continue;

    for (const component of result.address_components) {
      const types = component.types || [];

      // Sublocality extraction (Vaishali Nagar, Malviya Nagar, Mansarovar, etc.)
      if (!sublocality) {
        if (
          types.includes('sublocality_level_1') ||
          types.includes('sublocality_level_2') ||
          types.includes('sublocality') ||
          types.includes('neighborhood')
        ) {
          sublocality = component.long_name || component.short_name || '';
        }
      }

      // Locality extraction (Jaipur, Mumbai, etc.)
      if (!locality) {
        if (
          types.includes('locality') ||
          types.includes('postal_town') ||
          types.includes('administrative_area_level_2')
        ) {
          locality = component.long_name || component.short_name || '';
        }
      }

      // State extraction (Rajasthan, Maharashtra, etc.)
      if (!state) {
        if (types.includes('administrative_area_level_1')) {
          state = component.long_name || component.short_name || '';
        }
      }

      // Country extraction (India)
      if (!country) {
        if (types.includes('country')) {
          country = component.long_name || component.short_name || '';
        }
      }
    }
  }

  // Display Area hierarchy: Sublocality -> Locality -> State
  const area = sublocality || locality || state || 'Jaipur';
  const city = locality || sublocality || 'Jaipur';
  const resolvedState = state || 'Rajasthan';
  const resolvedCountry = country || 'India';

  return {
    area,
    city,
    state: resolvedState,
    country: resolvedCountry,
    formattedAddress,
    placeId,
    raw: results[0],
  };
}

export const GoogleGeocoder = {
  reverseGeocode,
  getGoogleApiKey,
};

export default GoogleGeocoder;
