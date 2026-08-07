/**
 * GoogleGeocoder — Production Google Maps Geocoding API integration.
 * Converts GPS coordinates into Sublocality, Neighborhood, Locality, District, State, and Country.
 *
 * Locality Extraction Priority per spec:
 *   sublocality_level_1
 *   ↓
 *   sublocality
 *   ↓
 *   neighborhood
 *   ↓
 *   locality
 *   ↓
 *   administrative_area_level_2
 *   ↓
 *   administrative_area_level_1
 */

import { GeocodingResult, LocationError } from './locationTypes';

// In-memory cache for recent reverse geocoding results (coordinates rounded to ~11 meters)
const geocodeCache = new Map<string, GeocodingResult>();

const LOG_PREFIX = '%c[Geocoding]';
const LOG_STYLE = 'color:#e6007e;font-weight:bold';

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

/** Strip the API key from a URL before logging it. */
function redactKey(url: string): string {
  return url.replace(/([?&]key=)[^&]+/i, '$1<REDACTED>');
}

/** Build the reverse-geocode URL. Exported for debugging/tests. */
export function buildGeocodeUrl(latitude: number, longitude: number, apiKey: string): string {
  return `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${encodeURIComponent(
    apiKey,
  )}&language=en`;
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
  customApiKey?: string,
): Promise<GeocodingResult> {
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached) {
    console.info(LOG_PREFIX, LOG_STYLE, 'Using cached reverse-geocode result for', cacheKey);
    return cached;
  }

  const apiKey = (customApiKey || getGoogleApiKey()).trim();

  // ---- STEP 1: API key ----
  if (!apiKey) {
    const reason =
      'VITE_GOOGLE_MAPS_API_KEY is missing. Set it in .env (and in Vercel → Production env vars), then rebuild.';
    console.error(LOG_PREFIX, LOG_STYLE, '❌ API key missing.', reason);
    const err: LocationError = { type: 'INVALID_API_KEY', message: reason };
    throw err;
  }

  const url = buildGeocodeUrl(latitude, longitude, apiKey);
  console.info(LOG_PREFIX, LOG_STYLE, {
    latitude,
    longitude,
    url: redactKey(url),
  });

  let response: Response;
  try {
    response = await fetch(url, { method: 'GET' });
  } catch (networkErr: any) {
    const reason = diagnoseNetworkError(networkErr);
    console.error(LOG_PREFIX, LOG_STYLE, '❌ Network error contacting Google Geocoding API.', {
      error: networkErr,
      reason,
    });
    const err: LocationError = {
      type: 'GEOCODING_FAILED',
      message: reason,
      originalError: networkErr,
    };
    throw err;
  }

  console.info(LOG_PREFIX, LOG_STYLE, 'HTTP Status:', response.status, response.statusText);

  if (!response.ok) {
    const reason = `Google Geocoding HTTP error ${response.status} ${response.statusText}`;
    console.error(LOG_PREFIX, LOG_STYLE, '❌', reason);
    const err: LocationError = { type: 'GEOCODING_FAILED', message: reason };
    throw err;
  }

  let data: any;
  try {
    data = await response.json();
  } catch (parseErr: any) {
    const reason = 'Google Geocoding returned a non-JSON response.';
    console.error(LOG_PREFIX, LOG_STYLE, '❌', reason, parseErr);
    const err: LocationError = { type: 'GEOCODING_FAILED', message: reason, originalError: parseErr };
    throw err;
  }

  console.info(LOG_PREFIX, LOG_STYLE, 'Complete Google response:', data);

  // ---- STEP 2: Translate Google status codes into precise, actionable errors ----
  if (data.status !== 'OK') {
    const diagnosis = diagnoseGoogleStatus(data.status, data.error_message);
    console.error(LOG_PREFIX, LOG_STYLE, '❌ Google Geocoding failed.', {
      status: data.status,
      error_message: data.error_message,
      diagnosis: diagnosis.message,
    });
    throw diagnosis;
  }

  if (!Array.isArray(data.results) || data.results.length === 0) {
    const reason = 'Google Geocoding returned no results for these coordinates.';
    console.error(LOG_PREFIX, LOG_STYLE, '❌', reason);
    const err: LocationError = { type: 'GEOCODING_FAILED', message: reason, originalError: data };
    throw err;
  }

  const parsed = parseGoogleGeocodingResults(data.results);
  console.info(LOG_PREFIX, LOG_STYLE, '✅ Extracted location:', {
    area: parsed.area,
    sublocality: parsed.sublocality,
    neighborhood: parsed.neighborhood,
    locality: parsed.locality,
    district: parsed.district,
    state: parsed.state,
    country: parsed.country,
  });

  geocodeCache.set(cacheKey, parsed);
  return parsed;
}

/**
 * Maps a Google Geocoding status to a precise, human- and developer-actionable error.
 */
function diagnoseGoogleStatus(status: string, errorMessage?: string): LocationError {
  const extra = errorMessage ? ` (${errorMessage})` : '';
  switch (status) {
    case 'ZERO_RESULTS':
      return {
        type: 'GEOCODING_FAILED',
        message: 'No address found for these GPS coordinates.',
        originalError: { status, errorMessage },
      };
    case 'OVER_QUERY_LIMIT':
      return {
        type: 'QUOTA_EXCEEDED',
        message:
          'Google Geocoding API quota exceeded. Enable billing and raise the Geocoding API quota in Google Cloud Console.',
        originalError: { status, errorMessage },
      };
    case 'REQUEST_DENIED':
      return {
        type: 'INVALID_API_KEY',
        message: describeRequestDenied(errorMessage),
        originalError: { status, errorMessage },
      };
    case 'INVALID_REQUEST':
      return {
        type: 'GEOCODING_FAILED',
        message: `Invalid Google Geocoding request${extra}. The lat/lng parameters were malformed.`,
        originalError: { status, errorMessage },
      };
    case 'UNKNOWN_ERROR':
      return {
        type: 'GEOCODING_FAILED',
        message: 'Google Geocoding server error. Please tap to Retry.',
        originalError: { status, errorMessage },
      };
    default:
      return {
        type: 'GEOCODING_FAILED',
        message: `Google Geocoding failed: ${status}${extra}`,
        originalError: { status, errorMessage },
      };
  }
}

/** REQUEST_DENIED can mean several different things — explain the common ones. */
function describeRequestDenied(errorMessage?: string): string {
  const msg = (errorMessage || '').toLowerCase();
  if (msg.includes('api key') && msg.includes('not')) {
    return 'Invalid Google API key. Check VITE_GOOGLE_MAPS_API_KEY in Google Cloud Console and Vercel env vars.';
  }
  if (msg.includes('referer')) {
    return 'Google API key referer restriction blocks this domain. Add the app/Vercel domain to the key\'s HTTP referrers (or use an unrestricted key for the web-service Geocoding API).';
  }
  if (msg.includes('billing')) {
    return 'Billing is disabled for this Google Cloud project. Enable billing to use the Geocoding API.';
  }
  if (msg.includes('not been used') || msg.includes('enabled')) {
    return 'The Geocoding API is not enabled for this Google Cloud project. Enable "Geocoding API" in Google Cloud Console.';
  }
  return (
    errorMessage ||
    'Google Geocoding request denied. Verify the API key, Geocoding API enablement, billing, and key restrictions.'
  );
}

/** Network-level failures (CORS, DNS, offline, blocked domains). */
function diagnoseNetworkError(err: any): string {
  const msg = String(err?.message || err || '').toLowerCase();
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'No internet connection. Please check your network to detect location.';
  }
  if (msg.includes('failed to fetch') || msg.includes('networkerror')) {
    return 'Network error while contacting Google Geocoding API. Check your connection, firewall, or CORS/referer settings.';
  }
  return err?.message || 'Network error while contacting Google Geocoding API.';
}

/**
 * Parses Google Geocoding address components following the priority:
 * sublocality_level_1 -> sublocality -> neighborhood -> locality
 *   -> administrative_area_level_2 -> administrative_area_level_1
 */
function parseGoogleGeocodingResults(results: any[]): GeocodingResult {
  let sublocalityLevel1 = '';
  let sublocality = '';
  let neighborhood = '';
  let locality = '';
  let postalTown = '';
  let district = ''; // administrative_area_level_2
  let state = ''; // administrative_area_level_1
  let country = '';
  const formattedAddress = results[0]?.formatted_address || '';
  const placeId = results[0]?.place_id || '';

  for (const result of results) {
    if (!Array.isArray(result.address_components)) continue;

    for (const component of result.address_components) {
      const types: string[] = component.types || [];
      const value = component.long_name || component.short_name || '';
      if (!value) continue;

      // Priority 1: sublocality_level_1 (e.g. "Vaishali Nagar")
      if (!sublocalityLevel1 && types.includes('sublocality_level_1')) {
        sublocalityLevel1 = value;
      }
      // Priority 2: sublocality (level_2 / generic)
      if (!sublocality && (types.includes('sublocality_level_2') || types.includes('sublocality'))) {
        sublocality = value;
      }
      // Priority 3: neighborhood
      if (!neighborhood && types.includes('neighborhood')) {
        neighborhood = value;
      }
      // Priority 4: locality
      if (!locality && (types.includes('locality') || types.includes('postal_town'))) {
        locality = value;
      }
      if (!postalTown && types.includes('postal_town')) {
        postalTown = value;
      }
      // Priority 5: administrative_area_level_2 (district)
      if (!district && (types.includes('administrative_area_level_2') || types.includes('administrative_area_level_3'))) {
        district = value;
      }
      // Priority 6: administrative_area_level_1 (state)
      if (!state && types.includes('administrative_area_level_1')) {
        state = value;
      }
      if (!country && types.includes('country')) {
        country = value;
      }
    }
  }

  // Best display area: follow the exact priority chain.
  const area =
    sublocalityLevel1 || sublocality || neighborhood || locality || district || state || '';
  const resolvedCity = locality || postalTown || district || sublocalityLevel1 || '';
  const resolvedState = state || '';
  const resolvedCountry = country || '';

  if (!area) {
    const reason =
      'Google response had no usable address_components (no sublocality, locality, district, or state).';
    console.error(LOG_PREFIX, LOG_STYLE, '❌', reason, results);
    const err: LocationError = { type: 'GEOCODING_FAILED', message: reason, originalError: results };
    throw err;
  }

  return {
    area,
    sublocality: sublocalityLevel1 || sublocality,
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
  buildGeocodeUrl,
};

export default GoogleGeocoder;
