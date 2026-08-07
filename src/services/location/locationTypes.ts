export interface CurrentLocation {
  latitude: number;
  longitude: number;
  area: string;            // Extracted best locality: sublocality -> neighborhood -> locality
  sublocality?: string;
  neighborhood?: string;
  locality?: string;
  district?: string;       // Administrative Area Level 2 (e.g. Jaipur District)
  city: string;            // Locality (e.g. "Jaipur")
  state: string;           // Administrative Area Level 1 (e.g. "Rajasthan")
  country: string;         // Country (e.g. "India")
  formattedAddress: string;
  accuracy: number;        // Accuracy in meters
  timestamp: number;       // Detection timestamp in epoch ms
  source?: 'gps' | 'manual'; // How the location was resolved
}

export type LocationErrorType =
  | 'PERMISSION_DENIED'
  | 'POSITION_UNAVAILABLE'
  | 'TIMEOUT'
  | 'OFFLINE'
  | 'GEOCODING_FAILED'
  | 'INVALID_API_KEY'
  | 'QUOTA_EXCEEDED'
  | 'UNKNOWN';

export interface LocationError {
  type: LocationErrorType;
  message: string;
  code?: number;
  originalError?: any;
}

export interface GeocodingResult {
  area: string;            // Best locality following sublocality -> neighborhood -> locality
  sublocality: string;
  neighborhood: string;
  locality: string;
  district: string;
  state: string;
  country: string;
  formattedAddress: string;
  placeId?: string;
  raw?: any;
}

export type RadiusOption = 2 | 5 | 10 | 'all';
