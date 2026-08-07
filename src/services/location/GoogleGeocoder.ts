/**
 * GoogleGeocoder — Production Google Maps Geocoding API integration.
 * Converts GPS coordinates into Sublocality, Neighborhood, Locality, District, State, and Country.
 * 
 * Locality Extraction Priority per spec:
 *   Sublocality (e.g. "Vaishali Nagar")
 *   ↓
 *   Neighborhood (e.g. "Civil Lines")
 *   ↓
 *   Locality (e.g. "Jaipur")
 */

import { GeocodingResult, LocationError } from './locationTypes';

// In-memory cache for recent reverse geocoding results (coordinates rounded to ~11 meters)
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
 * @returns GeocodingResult with extracted Sublocality, Neighborhood, Locality, District, State, Country
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
 * Parses Google Geocoding address components following the priority:
 * Sublocality -> Neighborhood -> Locality -> District -> State -> Country
 */
function parseGoogleGeocodingResults(results: any[]): GeocodingResult {
  let sublocality = '';
  let neighborhood = '';
  let locality = '';
  let district = '';
  let state = '';
  let country = '';
  let formattedAddress = results[0]?.formatted_address || '';
  const placeId = results[0]?.place_id || '';

  for (const result of results) {
    if (!Array.isArray(result.address_components)) continue;

    for (const component of result.address_components) {
      const types: string[] = component.types || [];

      // 1. Sublocality (e.g. "Vaishali Nagar", "Malviya Nagar")
      if (!sublocality) {
        if (
          types.includes('sublocality_level_1') ||
          types.includes('sublocality_level_2') ||
          types.includes('sublocality')
        ) {
          sublocality = component.long_name || component.short_name || '';
        }
      }

      // 2. Neighborhood
      if (!neighborhood) {
        if (types.includes('neighborhood')) {
          neighborhood = component.long_name || component.short_name || '';
        }
      }

      // 3. Locality (e.g. "Jaipur")
      if (!locality) {
        if (types.includes('locality') || types.includes('postal_town')) {
          locality = component.long_name || component.short_name || '';
        }
      }

      // 4. District (e.g. "Jaipur District")
      if (!district) {
        if (types.includes('administrative_area_level_2') || types.includes('administrative_area_level_3')) {
          district = component.long_name || component.short_name || '';
        }
      }

      // 5. State (e.g. "Rajasthan")
      if (!state) {
        if (types.includes('administrative_area_level_1')) {
          state = component.long_name || component.short_name || '';
        }
      }

      // 6. Country (e.g. "India")
      if (!country) {
        if (types.includes('country')) {
          country = component.long_name || component.short_name || '';
        }
      }
    }
  }

  // Locality Priority: sublocality -> neighborhood -> locality -> district -> state.
  // NOTE: We intentionally do NOT hardcode "Jaipur"/"Rajasthan"/"India" here.
  // When Google cannot resolve a component it stays empty so the UI can
  // clearly distinguish a real geocoded locality from a guess.
  const bestLocality = sublocality || neighborhood || locality || district || state || '';
  const resolvedCity = locality || district || sublocality || '';
  const resolvedState = state || '';
  const resolvedCountry = country || '';

  return {
    area: bestLocality,
    sublocality,
    neighborhood,
    locality: resolvedCity,
    district,
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
